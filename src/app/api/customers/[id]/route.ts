import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseClient, query } from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取单个客户详情（含购买记录）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const client = getSupabaseClient();

    // 获取客户基本信息
    const { data: customer, error: customerError } = await client
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ success: false, message: '客户不存在' }, { status: 404 });
    }

    // 获取客户的购买记录（从销售单中查询匹配的客户信息）
    const { data: salesOrders, error: salesError } = await client
      .from('sales_orders')
      .select(`
        id,
        order_no,
        total_amount,
        status,
        created_at,
        customer_name,
        customer_phone,
        warehouse_id
      `)
      .or(`customer_id.eq.${id},customer_phone.eq.${customer.phone}`)
      .order('created_at', { ascending: false })
      .limit(50);

    // 获取仓库信息用于显示
    let orders = salesOrders || [];
    if (orders.length > 0) {
      const warehouseIds = [...new Set(orders.map((o: { warehouse_id: number }) => o.warehouse_id).filter(Boolean))];
      if (warehouseIds.length > 0) {
        const { data: warehouses } = await client
          .from('warehouses')
          .select('id, name')
          .in('id', warehouseIds);
        
        const warehouseMap = new Map((warehouses || []).map((w: { id: number; name: string }) => [w.id, w.name]));
        
        orders = orders.map((order: { warehouse_id: number; warehouse_name?: string }) => ({
          ...order,
          warehouse_name: warehouseMap.get(order.warehouse_id) || '-'
        }));
      }
    }

    // 计算购买统计
    const totalPurchases = orders.reduce((sum: number, order: { total_amount: number }) => 
      sum + (parseFloat(String(order.total_amount)) || 0), 0);
    const purchaseCount = orders.length;

    // 获取每个订单的商品明细
    const ordersWithItems = await Promise.all(
      orders.map(async (order: { id: number }) => {
        const { data: items } = await client
          .from('sales_order_items')
          .select(`
            id,
            product_id,
            quantity,
            unit_price,
            amount
          `)
          .eq('order_id', order.id);

        // 获取商品名称
        let itemsWithProductNames = items || [];
        if (items && items.length > 0) {
          const productIds = items.map((item: { product_id: string }) => item.product_id).filter(Boolean);
          if (productIds.length > 0) {
            const { data: products } = await client
              .from('products')
              .select('id, name, sku')
              .in('id', productIds);
            
            const productMap = new Map<string, { name: string; sku: string }>();
            (products || []).forEach((p: { id: string; name: string; sku: string }) => {
              productMap.set(p.id, { name: p.name, sku: p.sku });
            });

            itemsWithProductNames = items.map((item: { product_id: string }) => {
              const product = productMap.get(item.product_id);
              return {
                ...item,
                product_name: product?.name || '未知商品',
                product_sku: product?.sku || '-'
              };
            });
          }
        }

        return {
          ...order,
          items: itemsWithProductNames
        };
      })
    );

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        total_purchases: totalPurchases,
        purchase_count: purchaseCount
      },
      orders: ordersWithItems
    });
  } catch (error) {
    console.error('Get customer detail error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
