import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';

// 获取进货单列表 - 需要登录 + order:read权限
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 检查读取权限
    if (!hasPermission(currentUser, 'order:read')) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const client = getSupabaseClient();
    
    // 先查询进货单
    let query = client
      .from('purchase_orders')
      .select('id, order_no, total_amount, status, created_at, supplier_id, warehouse_id')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`order_no.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get purchase orders error:', error.message);
      // 如果表不存在，返回空数组
      return NextResponse.json({
        success: true,
        orders: []
      });
    }

    // 获取供应商和仓库信息
    let orders = data || [];
    
    if (orders.length > 0) {
      try {
        // 获取所有供应商 ID
        const supplierIds = [...new Set(orders.map((o: { supplier_id: number }) => o.supplier_id).filter(Boolean))];
        // 获取所有仓库 ID
        const warehouseIds = [...new Set(orders.map((o: { warehouse_id: number }) => o.warehouse_id).filter(Boolean))];
        
        let supplierMap = new Map<number, string>();
        let warehouseMap = new Map<number, string>();
        
        // 查询供应商
        if (supplierIds.length > 0) {
          const { data: suppliers } = await client
            .from('suppliers')
            .select('id, name')
            .in('id', supplierIds);
          (suppliers || []).forEach((s: { id: number; name: string }) => {
            supplierMap.set(s.id, s.name);
          });
        }
        
        // 查询仓库
        if (warehouseIds.length > 0) {
          const { data: warehouses } = await client
            .from('warehouses')
            .select('id, name')
            .in('id', warehouseIds);
          (warehouses || []).forEach((w: { id: number; name: string }) => {
            warehouseMap.set(w.id, w.name);
          });
        }
        
        // 组装数据
        orders = orders.map((item: Record<string, unknown>) => ({
          id: item.id,
          order_no: item.order_no,
          total_amount: item.total_amount,
          status: item.status,
          created_at: item.created_at,
          supplier_name: supplierMap.get(item.supplier_id as number) || '-',
          warehouse_name: warehouseMap.get(item.warehouse_id as number) || '-'
        }));
      } catch {
        // 忽略关联查询错误
        orders = orders.map((item: Record<string, unknown>) => ({
          ...item,
          supplier_name: '-',
          warehouse_name: '-'
        }));
      }
    }

    return NextResponse.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json({
      success: true,
      orders: []
    });
  }
}

// 创建进货单 - 需要经理或管理员权限 + order:write权限
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 检查写入权限
    if (!hasPermission(currentUser, 'order:write')) {
      return NextResponse.json(
        { success: false, message: '权限不足，需要经理或管理员权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { items, supplierId, warehouseId, totalAmount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: '进货单明细不能为空' },
        { status: 400 }
      );
    }

    if (!warehouseId) {
      return NextResponse.json(
        { success: false, message: '请选择仓库' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 生成订单号
    const orderNo = `PO${Date.now()}`;

    // 创建进货单
    const { data: order, error: orderError } = await client
      .from('purchase_orders')
      .insert({
        order_no: orderNo,
        supplier_id: supplierId || null,
        warehouse_id: warehouseId,
        total_amount: totalAmount || 0,
        status: 'completed'
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Create purchase order error:', orderError?.message);
      return NextResponse.json(
        { success: false, message: '创建进货单失败' },
        { status: 500 }
      );
    }

    // 创建进货单明细
    const orderItems = items.map((item: { productId: string; quantity: number; price: number; amount: number }) => ({
      purchase_order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      amount: item.amount
    }));

    const { error: itemsError } = await client
      .from('purchase_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Create purchase order items error:', itemsError.message);
      // 回滚订单
      await client.from('purchase_orders').delete().eq('id', order.id);
      return NextResponse.json(
        { success: false, message: '创建进货单明细失败' },
        { status: 500 }
      );
    }

    // 更新库存（进货增加库存）
    for (const item of items) {
      const { data: inventory } = await client
        .from('inventory')
        .select('*')
        .eq('product_id', item.productId)
        .eq('warehouse_id', warehouseId)
        .single();

      if (inventory) {
        const newQuantity = (inventory.quantity || 0) + item.quantity;
        await client
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', inventory.id);
      } else {
        // 创建新的库存记录
        await client
          .from('inventory')
          .insert({
            product_id: item.productId,
            warehouse_id: warehouseId,
            quantity: item.quantity
          });
      }
    }

    // 记录审计日志
    logAudit(request, 'CREATE_PURCHASE_ORDER', 'purchase_orders', order.id, { 
      orderNo, 
      supplierId, 
      warehouseId,
      itemCount: items.length 
    });

    return NextResponse.json({
      success: true,
      message: '进货单创建成功',
      order
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除进货单 - 需要管理员权限 + order:delete权限
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 检查删除权限（仅管理员）
    if (!hasPermission(currentUser, 'order:delete')) {
      return NextResponse.json(
        { success: false, message: '权限不足，需要管理员权限' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: '缺少进货单ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 删除进货单明细
    await client.from('purchase_order_items').delete().eq('purchase_order_id', orderId);

    // 删除进货单
    const { error } = await client
      .from('purchase_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Delete purchase order error:', error.message);
      return NextResponse.json(
        { success: false, message: '删除进货单失败' },
        { status: 500 }
      );
    }

    // 记录审计日志
    logAudit(request, 'DELETE_PURCHASE_ORDER', 'purchase_orders', orderId);

    return NextResponse.json({
      success: true,
      message: '进货单已删除'
    });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
