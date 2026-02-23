'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Search, Plus, Eye, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getWithAuth, postWithAuth, putWithAuth, deleteWithAuth } from '@/lib/fetch-with-auth';

interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string;
  wechat?: string;
  email?: string;
  address?: string;
  credit_limit?: string;
  total_purchases?: string;
  purchase_count?: number;
  created_at: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });

  // 新建/编辑客户对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    wechat: '',
    email: '',
    address: '',
    creditLimit: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search, pagination.page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());

      const data = await getWithAuth<{ 
        success: boolean; 
        customers: Customer[];
        pagination: Pagination 
      }>(`/api/customers?${params}`);

      if (data.success) {
        setCustomers(data.customers || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入客户姓名';
    }

    if (!formData.phone.trim()) {
      errors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      errors.phone = '请输入正确的手机号格式';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入正确的邮箱格式';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        wechat: customer.wechat || '',
        email: customer.email || '',
        address: customer.address || '',
        creditLimit: customer.credit_limit || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        wechat: '',
        email: '',
        address: '',
        creditLimit: ''
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingCustomer) {
        // 更新
        const data = await putWithAuth<{ success: boolean; message?: string }>('/api/customers', {
          id: editingCustomer.id,
          ...formData
        });
        if (data.success) {
          toast.success('客户更新成功');
          setDialogOpen(false);
          fetchCustomers();
        } else {
          toast.error(data.message || '更新失败');
        }
      } else {
        // 新建
        const data = await postWithAuth<{ success: boolean; message?: string }>('/api/customers', formData);
        if (data.success) {
          toast.success('客户创建成功');
          setDialogOpen(false);
          fetchCustomers();
        } else {
          toast.error(data.message || '创建失败');
        }
      }
    } catch (error) {
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该客户吗？')) return;

    try {
      const data = await deleteWithAuth<{ success: boolean; message?: string }>(`/api/customers?id=${id}`);
      if (data.success) {
        toast.success('客户已删除');
        fetchCustomers();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      toast.error('网络错误');
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(num || 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              客户管理
            </h1>
            <p className="text-gray-600 mt-1">管理客户信息和购买记录</p>
          </div>
          {user?.role !== 'user' && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              新建客户
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索姓名、手机号、微信号、地址..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>客户编码</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>手机号</TableHead>
                      <TableHead>微信号</TableHead>
                      <TableHead>地址</TableHead>
                      <TableHead className="text-right">购买总额</TableHead>
                      <TableHead className="text-center">购买次数</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          {search ? '未找到匹配的客户' : '暂无客户数据'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-mono text-sm">{customer.code}</TableCell>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>{customer.wechat || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{customer.address || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(customer.total_purchases || 0)}
                          </TableCell>
                          <TableCell className="text-center">{customer.purchase_count || 0}</TableCell>
                          <TableCell>
                            {new Date(customer.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Link href={`/customers/${customer.id}`}>
                                <Button variant="ghost" size="sm" title="查看详情">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              {user?.role !== 'user' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    title="编辑"
                                    onClick={() => handleOpenDialog(customer)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {user?.role === 'admin' && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      title="删除"
                                      onClick={() => handleDelete(customer.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* 分页 */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 新建/编辑客户对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? '编辑客户' : '新建客户'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className={formErrors.name ? 'text-red-500' : ''}>
                  姓名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="请输入客户姓名"
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label className={formErrors.phone ? 'text-red-500' : ''}>
                  手机号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                  }}
                  placeholder="请输入手机号"
                  className={formErrors.phone ? 'border-red-500' : ''}
                />
                {formErrors.phone && <p className="text-sm text-red-500">{formErrors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label>微信号</Label>
                <Input
                  value={formData.wechat}
                  onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
                  placeholder="请输入微信号（选填）"
                />
              </div>

              <div className="space-y-2">
                <Label className={formErrors.email ? 'text-red-500' : ''}>邮箱</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                  }}
                  placeholder="请输入邮箱（选填）"
                  className={formErrors.email ? 'border-red-500' : ''}
                />
                {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label>地址</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="请输入地址（选填）"
                />
              </div>

              <div className="space-y-2">
                <Label>信用额度</Label>
                <Input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  placeholder="请输入信用额度（选填）"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
