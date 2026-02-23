'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { getWithAuth, postWithAuth, putWithAuth } from '@/lib/fetch-with-auth';

interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string | null;
  manager: string | null;
  phone: string | null;
  capacity: number;
  is_active: boolean;
}

export default function WarehousesPage() {
  const { user: currentUser } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    manager: '',
    phone: '',
    capacity: '0'
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; warehouses: Warehouse[] }>('/api/warehouses');
      if (data.success) {
        setWarehouses(data.warehouses);
      }
    } catch (error) {
      toast.error('获取仓库列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address || '',
        manager: warehouse.manager || '',
        phone: warehouse.phone || '',
        capacity: warehouse.capacity.toString()
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ name: '', code: '', address: '', manager: '', phone: '', capacity: '0' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.code) {
        toast.error('请填写必填项');
        return;
      }

      const payload = {
        name: formData.name,
        code: formData.code,
        address: formData.address || null,
        manager: formData.manager || null,
        phone: formData.phone || null,
        capacity: parseInt(formData.capacity) || 0
      };

      let data;
      if (editingWarehouse) {
        data = await putWithAuth<{ success: boolean; message?: string }>(`/api/warehouses/${editingWarehouse.id}`, payload);
      } else {
        data = await postWithAuth<{ success: boolean; message?: string }>('/api/warehouses', payload);
      }

      if (data.success) {
        toast.success(editingWarehouse ? '仓库更新成功' : '仓库创建成功');
        setDialogOpen(false);
        fetchWarehouses();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
              <Warehouse className="mr-2 h-8 w-8" />
              仓库管理
            </h1>
            <p className="text-gray-600 mt-1">管理多个仓库信息</p>
          </div>
          
          {currentUser?.role !== 'user' && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              新增仓库
            </Button>
          )}
        </div>

        {/* 仓库列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">加载中...</div>
          ) : warehouses.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">暂无仓库数据</div>
          ) : (
            warehouses.map((warehouse) => (
              <Card key={warehouse.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{warehouse.name}</h3>
                      <p className="text-sm text-gray-500">{warehouse.code}</p>
                    </div>
                    <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                      {warehouse.is_active ? '启用' : '禁用'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">地址：</span>
                      <span>{warehouse.address || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">负责人：</span>
                      <span>{warehouse.manager || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">电话：</span>
                      <span>{warehouse.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">容量：</span>
                      <span>{warehouse.capacity || '不限'}</span>
                    </div>
                  </div>
                  {currentUser?.role !== 'user' && (
                    <div className="mt-4 pt-4 border-t">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => handleOpenDialog(warehouse)}>
                        <Edit className="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 新增/编辑仓库对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? '编辑仓库' : '新增仓库'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">仓库名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入仓库名称"
              />
            </div>
            
            <div>
              <Label htmlFor="code">仓库编码 *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="请输入仓库编码"
                disabled={!!editingWarehouse}
              />
            </div>
            
            <div>
              <Label htmlFor="address">地址</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="请输入地址"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manager">负责人</Label>
                <Input
                  id="manager"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="负责人姓名"
                />
              </div>
              <div>
                <Label htmlFor="phone">电话</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="联系电话"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="capacity">容量</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="0表示不限制"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingWarehouse ? '更新' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
