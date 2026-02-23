'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useI18n } from '@/components/providers/I18nProvider';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, TrendingDown, DollarSign, Users, Warehouse, AlertTriangle, Loader2 } from 'lucide-react';
import { getWithAuth } from '@/lib/fetch-with-auth';

interface DashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  lowStockProducts: number;
  todaySales: number;
  todayPurchases: number;
  todaySalesAmount: number;
  todayPurchaseAmount: number;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalWarehouses: 0,
    lowStockProducts: 0,
    todaySales: 0,
    todayPurchases: 0,
    todaySalesAmount: 0,
    todayPurchaseAmount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; stats: DashboardStats }>('/api/dashboard/stats');
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录状态（AuthProvider 会重定向到登录页）
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">正在跳转到登录页...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('home.welcome')}, {user.name}!</h1>
          <p className="text-gray-600 mt-1">{t('home.overview')}</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('home.activeProducts')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
            <div className="text-2xl font-bold text-gray-400">-</div>
          ) : (
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('home.activeWarehouses')}</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWarehouses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('home.todaySales')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySales}</div>
              <p className="text-xs text-muted-foreground mt-1">
                销售订单数
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('home.todayPurchase')}</CardTitle>
              <TrendingDown className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayPurchases}</div>
            </CardContent>
          </Card>
        </div>

        {/* 第二行统计卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('home.todaySalesAmount')}</CardTitle>
              <CardDescription>{t('home.todaySalesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div className="text-3xl font-bold text-green-600">
                  ￥{stats.todaySalesAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('home.lowStock')}</CardTitle>
              <CardDescription>{t('home.lowStockDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <AlertTriangle className={`h-8 w-8 mr-3 ${stats.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                <div>
                  <div className={`text-3xl font-bold ${stats.lowStockProducts > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {stats.lowStockProducts}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('home.restockNeeded')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用功能快速访问</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {user.role !== 'user' && (
                <a href="/sales/new" className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <TrendingUp className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium text-gray-900">新建销售单</span>
                </a>
              )}
              {user.role !== 'user' && (
                <a href="/purchase/new" className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <TrendingDown className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium text-gray-900">新建进货单</span>
                </a>
              )}
              <a href="/inventory" className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <Package className="h-5 w-5 text-purple-600 mr-3" />
                <span className="font-medium text-gray-900">库存查询</span>
              </a>
              {user.role === 'admin' && (
                <a href="/users" className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <Users className="h-5 w-5 text-orange-600 mr-3" />
                  <span className="font-medium text-gray-900">用户管理</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
