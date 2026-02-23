import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission } from '@/lib/api-security';

// 获取报表统计数据 - 需要登录 + report:read权限
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 检查报表读取权限
    if (!hasPermission(currentUser, 'report:read')) {
      return NextResponse.json(
        { success: false, message: '权限不足，需要经理或管理员权限' },
        { status: 403 }
      );
    }

    const client = getSupabaseClient();
    
    // 获取销售订单统计
    const { data: salesOrders } = await client
      .from('sales_orders')
      .select('total_amount')
      .eq('status', 'completed');

    // 获取进货订单统计
    const { data: purchaseOrders } = await client
      .from('purchase_orders')
      .select('total_amount')
      .eq('status', 'completed');

    // 获取商品统计
    const { data: products } = await client
      .from('products')
      .select('id, name, min_stock');

    // 获取库存统计
    const { data: inventory } = await client
      .from('inventory')
      .select('product_id, quantity');

    // 计算统计数据
    const totalSales = salesOrders?.length || 0;
    const totalPurchases = purchaseOrders?.length || 0;
    const totalSalesAmount = salesOrders?.reduce((sum: number, order: { total_amount: number }) => sum + (order.total_amount || 0), 0) || 0;
    const totalPurchaseAmount = purchaseOrders?.reduce((sum: number, order: { total_amount: number }) => sum + (order.total_amount || 0), 0) || 0;
    
    // 计算低库存商品数量
    const inventoryMap = new Map<string, number>();
    inventory?.forEach((item: { product_id: string; quantity: number }) => {
      inventoryMap.set(item.product_id, item.quantity);
    });
    
    const lowStockCount = products?.filter((product: { id: string; min_stock: number }) => {
      const qty = inventoryMap.get(product.id) || 0;
      return qty < (product.min_stock || 10);
    }).length || 0;

    // 获取热销商品
    const { data: salesItems } = await client
      .from('sales_order_items')
      .select('quantity, total_price, product_id')
      .limit(100);

    // 获取商品名称映射
    let productMap = new Map<string, string>();
    if (salesItems && salesItems.length > 0) {
      const productIds = [...new Set(salesItems.map((item: { product_id: string }) => item.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: productData } = await client
          .from('products')
          .select('id, name')
          .in('id', productIds);
        (productData || []).forEach((p: { id: string; name: string }) => {
          productMap.set(p.id, p.name);
        });
      }
    }

    // 按商品汇总
    const productSales = new Map<string, { name: string; quantity: number; amount: number }>();
    salesItems?.forEach((item: { quantity: number; total_price: number; product_id: string }) => {
      const productName = productMap.get(item.product_id) || '未知商品';
      const existing = productSales.get(productName) || { name: productName, quantity: 0, amount: 0 };
      existing.quantity += item.quantity || 0;
      existing.amount += item.total_price || 0;
      productSales.set(productName, existing);
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      stats: {
        totalSales,
        totalPurchases,
        totalSalesAmount,
        totalPurchaseAmount,
        totalProducts: products?.length || 0,
        lowStockCount,
        topProducts,
        dailySales: []
      }
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    // 返回默认数据
    return NextResponse.json({
      success: true,
      stats: {
        totalSales: 0,
        totalPurchases: 0,
        totalSalesAmount: 0,
        totalPurchaseAmount: 0,
        totalProducts: 0,
        lowStockCount: 0,
        topProducts: [],
        dailySales: []
      }
    });
  }
}
