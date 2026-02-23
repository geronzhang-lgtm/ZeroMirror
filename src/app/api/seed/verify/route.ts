import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';

/**
 * 验证数据统计
 * GET /api/seed/verify
 */
export async function GET(request: NextRequest) {
  try {
    // 客户统计
    const customerStats = await query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN wechat IS NOT NULL THEN 1 END) as with_wechat,
        COUNT(CASE WHEN address IS NOT NULL THEN 1 END) as with_address
      FROM customers WHERE is_active = true
    `);

    // 销售订单统计
    const orderStats = await query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total,
        SUM(total_amount) as total_amount,
        AVG(total_amount) as avg_amount
      FROM sales_orders
    `);

    // 订单明细统计
    const itemStats = await query<RowDataPacket[]>(`
      SELECT COUNT(*) as total FROM sales_order_items
    `);

    // 客户购买排行前10
    const topCustomers = await query<RowDataPacket[]>(`
      SELECT 
        c.name,
        c.phone,
        c.total_purchases,
        c.purchase_count
      FROM customers c
      WHERE c.is_active = true
      ORDER BY c.total_purchases DESC
      LIMIT 10
    `);

    // 最近订单
    const recentOrders = await query<RowDataPacket[]>(`
      SELECT 
        so.order_no,
        so.customer_name,
        so.total_amount,
        so.created_at
      FROM sales_orders so
      ORDER BY so.created_at DESC
      LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      statistics: {
        customers: customerStats[0],
        orders: orderStats[0],
        orderItems: itemStats[0],
        topCustomers,
        recentOrders
      }
    });

  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({
      success: false,
      message: `验证失败: ${error.message}`
    }, { status: 500 });
  }
}
