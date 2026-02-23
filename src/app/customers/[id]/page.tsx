'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Phone, Mail, MapPin, CreditCard, ShoppingBag, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { getWithAuth } from '@/lib/fetch-with-auth';

interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string;
  wechat?: string;
  email?: string;
  address?: string;
  credit_limit?: string;
  total_purchases?: number;
  purchase_count?: number;
  created_at: string;
}

interface OrderItem {
  id: number;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface SalesOrder {
  id: number;
  order_no: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  warehouse_name: string;
  items: OrderItem[];
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  useEffect(() => {
    fetchCustomerDetail();
  }, [customerId]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      const data = await getWithAuth<{
        success: boolean;
        customer: Customer;
        orders: SalesOrder[];
      }>(`/api/customers/${customerId}`);

      if (data.success) {
        setCustomer(data.customer);
        setOrders(data.orders || []);
      } else {
        toast.error('获取客户信息失败');
        router.push('/customers');
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      toast.error('网络错误');
      router.push('/customers');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(num || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">已取消</Badge>;
      default:
        return <Badge variant="secondary">待处理</Badge>;
    }
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

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">客户不存在</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">客户详情</h1>
        </div>

        {/* 客户基本信息 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                客户信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Hash className="h-4 w-4 text-gray-400" />
                <span className="font-mono text-sm">{customer.code}</span>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-lg">{customer.name}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{customer.phone}</span>
              </div>

              {customer.wechat && (
                <div className="flex items-center gap-3 text-gray-600">
                  <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                  <span>{customer.wechat}</span>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{customer.email}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-3 text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>{customer.address}</span>
                </div>
              )}

              {customer.credit_limit && (
                <div className="flex items-center gap-3 text-gray-600">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span>信用额度：{formatCurrency(customer.credit_limit)}</span>
                </div>
              )}

              <div className="pt-4 border-t text-sm text-gray-500">
                注册时间：{new Date(customer.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </CardContent>
          </Card>

          {/* 购买统计 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                购买统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-6 text-center">
                  <p className="text-blue-600 text-sm mb-2">累计消费金额</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {formatCurrency(customer.total_purchases || 0)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <p className="text-green-600 text-sm mb-2">购买次数</p>
                  <p className="text-3xl font-bold text-green-700">
                    {customer.purchase_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 购买记录 */}
        <Card>
          <CardHeader>
            <CardTitle>购买记录</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无购买记录</p>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {order.order_no}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>商品</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">数量</TableHead>
                          <TableHead className="text-right">单价</TableHead>
                          <TableHead className="text-right">金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell className="font-mono text-sm">{item.product_sku}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <span className="text-sm text-gray-500">
                        仓库：{order.warehouse_name}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        订单总额：{formatCurrency(order.total_amount)}
                      </span>
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
