'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Warehouse, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getWithAuth } from '@/lib/fetch-with-auth';

interface InventoryItem {
  id: number;
  product_id: number;
  warehouse_id: number;
  quantity: number;
  locked_quantity: number;
  products: {
    id: number;
    sku: string;
    name: string;
    unit: string;
    sale_price: string;
    min_stock: number;
  };
  warehouses: {
    id: number;
    name: string;
    code: string;
  };
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
}

export default function InventoryPage() {
  const { user: currentUser } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  useEffect(() => {
    fetchWarehouses();
    fetchInventory();
  }, [search, selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; warehouses: Warehouse[] }>('/api/warehouses');
      if (data.success) {
        setWarehouses(data.warehouses);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedWarehouse && selectedWarehouse !== 'all') params.append('warehouseId', selectedWarehouse);
      
      const data = await getWithAuth<{ success: boolean; inventory: InventoryItem[] }>(`/api/inventory?${params}`);
      
      if (data.success) {
        setInventory(data.inventory);
      }
    } catch (error) {
      toast.error('获取库存列表失败');
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = (item: InventoryItem) => {
    return item.products?.min_stock > 0 && item.quantity < item.products.min_stock;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
            <Warehouse className="mr-2 h-8 w-8" />
            库存管理
          </h1>
          <p className="text-gray-600 mt-1">查看和管理各仓库库存</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索商品编码或名称..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="全部仓库" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部仓库</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id.toString()}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 库存列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">加载中...</div>
          ) : inventory.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">暂无库存数据</div>
          ) : (
            inventory.map((item) => (
              <Card key={item.id} className={isLowStock(item) ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center">
                        {item.products?.name || '-'}
                        {isLowStock(item) && (
                          <AlertTriangle className="h-4 w-4 text-red-600 ml-2" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{item.products?.sku || '-'}</p>
                    </div>
                    <Badge>{item.products?.unit || '-'}</Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">仓库：</span>
                      <span className="font-medium">{item.warehouses?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">库存数量：</span>
                      <span className={`font-bold text-lg ${isLowStock(item) ? 'text-red-600' : 'text-blue-600'}`}>
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">锁定数量：</span>
                      <span>{item.locked_quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">可用数量：</span>
                      <span className="font-medium">{item.quantity - item.locked_quantity}</span>
                    </div>
                    {item.products?.min_stock > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">库存预警：</span>
                        <span>{item.products.min_stock}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
