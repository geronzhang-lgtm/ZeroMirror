import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: Request) {
  const defaultStats = {
    totalProducts: 0,
    totalWarehouses: 0,
    lowStockProducts: 0,
    todaySales: 0,
    todayPurchases: 0,
    todaySalesAmount: 0,
    todayPurchaseAmount: 0,
  };

  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    // 查询商品总数
    const { count: totalProducts } = await client
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // 查询仓库数量
    const { count: totalWarehouses } = await client
      .from('warehouses')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // 查询今日销售
    const { data: salesData } = await client
      .from('sales_orders')
      .select('id, total_amount')
      .gte('created_at', today);

    // 查询今日进货
    const { data: purchaseData } = await client
      .from('purchase_orders')
      .select('id, total_amount')
      .gte('created_at', today);

    // 查询库存预警
    const { data: lowStockData } = await client
      .from('inventory')
      .select('product_id')
      .eq('quantity', 0);

    // 计算金额
    const todaySalesAmount = (salesData || []).reduce((sum: number, item: { total_amount: string }) => {
      return sum + parseFloat(item.total_amount || '0');
    }, 0);

    const todayPurchaseAmount = (purchaseData || []).reduce((sum: number, item: { total_amount: string }) => {
      return sum + parseFloat(item.total_amount || '0');
    }, 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts: totalProducts || 0,
        totalWarehouses: totalWarehouses || 0,
        lowStockProducts: (lowStockData || []).length,
        todaySales: (salesData || []).length,
        todayPurchases: (purchaseData || []).length,
        todaySalesAmount,
        todayPurchaseAmount,
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({
      success: true,
      stats: defaultStats
    });
  }
}
