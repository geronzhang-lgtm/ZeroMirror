'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Calendar } from 'lucide-react';
import { getWithAuth } from '@/lib/fetch-with-auth';

interface ReportStats {
  totalSales: number;
  totalPurchases: number;
  totalSalesAmount: number;
  totalPurchaseAmount: number;
  totalProducts: number;
  lowStockCount: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;
  dailySales: Array<{
    date: string;
    amount: number;
  }>;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    totalPurchases: 0,
    totalSalesAmount: 0,
    totalPurchaseAmount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    topProducts: [],
    dailySales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; stats: ReportStats }>('/api/reports/stats');
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报表统计</h1>
          <p className="text-gray-600 mt-1">查看业务数据统计和分析报告</p>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">销售订单</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">累计订单数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">进货订单</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPurchases}</div>
              <p className="text-xs text-muted-foreground mt-1">累计订单数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">销售总额</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalSalesAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">累计销售额</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">进货总额</CardTitle>
              <TrendingDown className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalPurchaseAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">累计进货额</p>
            </CardContent>
          </Card>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>利润分析</CardTitle>
              <CardDescription>销售额与进货额对比</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">销售总额</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(stats.totalSalesAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">进货总额</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(stats.totalPurchaseAmount)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">毛利润</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(stats.totalSalesAmount - stats.totalPurchaseAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>库存概况</CardTitle>
              <CardDescription>商品库存状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">商品总数</span>
                  <span className="font-bold">{stats.totalProducts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">库存预警</span>
                  <span className={`font-bold ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {stats.lowStockCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 热销商品 */}
        <Card>
          <CardHeader>
            <CardTitle>热销商品 TOP 10</CardTitle>
            <CardDescription>按销售数量排序</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <p className="text-center py-8 text-gray-500">暂无销售数据</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(product.amount)}</div>
                      <div className="text-sm text-gray-500">销量: {product.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
