import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';

// 获取销售单列表 - 需要登录 + order:read权限
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
    
    // 先查询销售单
    let query = client
      .from('sales_orders')
      .select('id, order_no, total_amount, status, created_at, customer_id, warehouse_id, customer_name, customer_phone')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`order_no.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get sales orders error:', error.message);
      // 如果表不存在，返回空数组
      return NextResponse.json({
        success: true,
        orders: []
      });
    }

    // 获取客户和仓库信息
    let orders = data || [];
    
    if (orders.length > 0) {
      try {
        // 获取所有客户 ID
        const customerIds = [...new Set(orders.map((o: { customer_id: number }) => o.customer_id).filter(Boolean))];
        // 获取所有仓库 ID
        const warehouseIds = [...new Set(orders.map((o: { warehouse_id: number }) => o.warehouse_id).filter(Boolean))];
        
        let customerMap = new Map<number, string>();
        let warehouseMap = new Map<number, string>();
        
        // 查询客户
        if (customerIds.length > 0) {
          const { data: customers } = await client
            .from('customers')
            .select('id, name')
            .in('id', customerIds);
          (customers || []).forEach((c: { id: number; name: string }) => {
            customerMap.set(c.id, c.name);
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
        
        // 组装数据 - 优先使用销售单中存储的客户信息
        orders = orders.map((item: Record<string, unknown>) => ({
          id: item.id,
          order_no: item.order_no,
          total_amount: item.total_amount,
          status: item.status,
          created_at: item.created_at,
          customer_name: (item.customer_name as string) || customerMap.get(item.customer_id as number) || '散客',
          customer_phone: item.customer_phone || '',
          warehouse_name: warehouseMap.get(item.warehouse_id as number) || '-'
        }));
      } catch {
        // 忽略关联查询错误
        orders = orders.map((item: Record<string, unknown>) => ({
          ...item,
          customer_name: (item.customer_name as string) || '散客',
          customer_phone: item.customer_phone || '',
          warehouse_name: '-'
        }));
      }
    }

    return NextResponse.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get sales orders error:', error);
    return NextResponse.json({
      success: true,
      orders: []
    });
  }
}

// 创建销售单 - 需要经理或管理员权限 + order:write权限
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
    const { items, customerInfo, warehouseId, totalAmount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: '销售单明细不能为空' },
        { status: 400 }
      );
    }

    if (!warehouseId) {
      return NextResponse.json(
        { success: false, message: '请选择仓库' },
        { status: 400 }
      );
    }

    // 验证客户必填信息
    if (!customerInfo?.name?.trim()) {
      return NextResponse.json(
        { success: false, message: '请输入客户姓名' },
        { status: 400 }
      );
    }

    if (!customerInfo?.phone?.trim()) {
      return NextResponse.json(
        { success: false, message: '请输入客户手机号' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 生成订单号
    const orderNo = `SO${Date.now()}`;

    // 创建销售单
    const { data: order, error: orderError } = await client
      .from('sales_orders')
      .insert({
        order_no: orderNo,
        customer_id: null,
        warehouse_id: warehouseId,
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.trim(),
        customer_wechat: customerInfo.wechat?.trim() || null,
        customer_address: customerInfo.address?.trim() || null,
        total_amount: totalAmount || 0,
        status: 'completed'
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Create sales order error:', orderError?.message);
      return NextResponse.json(
        { success: false, message: '创建销售单失败' },
        { status: 500 }
      );
    }

    // 创建销售单明细
    const orderItems = items.map((item: { productId: string; quantity: number; price: number; amount: number }) => ({
      sales_order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      amount: item.amount
    }));

    const { error: itemsError } = await client
      .from('sales_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Create sales order items error:', itemsError.message);
      // 回滚订单
      await client.from('sales_orders').delete().eq('id', order.id);
      return NextResponse.json(
        { success: false, message: '创建销售单明细失败' },
        { status: 500 }
      );
    }

    // 更新库存
    for (const item of items) {
      const { data: inventory } = await client
        .from('inventory')
        .select('*')
        .eq('product_id', item.productId)
        .eq('warehouse_id', warehouseId)
        .single();

      if (inventory) {
        const newQuantity = Math.max(0, (inventory.quantity || 0) - item.quantity);
        await client
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', inventory.id);
      }
    }

    // 记录审计日志
    logAudit(request, 'CREATE_SALES_ORDER', 'sales_orders', order.id, { 
      orderNo, 
      customerInfo,
      warehouseId,
      itemCount: items.length 
    });

    return NextResponse.json({
      success: true,
      message: '销售单创建成功',
      order
    });
  } catch (error) {
    console.error('Create sales order error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除销售单 - 需要管理员权限 + order:delete权限
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
        { success: false, message: '缺少销售单ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 删除销售单明细
    await client.from('sales_order_items').delete().eq('sales_order_id', orderId);

    // 删除销售单
    const { error } = await client
      .from('sales_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Delete sales order error:', error.message);
      return NextResponse.json(
        { success: false, message: '删除销售单失败' },
        { status: 500 }
      );
    }

    // 记录审计日志
    logAudit(request, 'DELETE_SALES_ORDER', 'sales_orders', orderId);

    return NextResponse.json({
      success: true,
      message: '销售单已删除'
    });
  } catch (error) {
    console.error('Delete sales order error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
