'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getWithAuth, postWithAuth } from '@/lib/fetch-with-auth';

interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  purchase_price: string;
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
}

interface Supplier {
  id: number;
  name: string;
  code: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  amount: number;
}

export default function NewPurchasePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    fetchSuppliers();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; products: Product[] }>('/api/products');
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; warehouses: Warehouse[] }>('/api/warehouses');
      if (data.success) {
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; suppliers: Supplier[] }>('/api/suppliers');
      if (data.success) {
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error('请选择商品');
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity) || 1;
    const price = parseFloat(product.purchase_price) || 0;
    const amount = qty * price;

    // 检查是否已存在
    const existingIndex = items.findIndex(item => item.productId === selectedProduct);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += qty;
      newItems[existingIndex].amount = newItems[existingIndex].quantity * newItems[existingIndex].price;
      setItems(newItems);
    } else {
      setItems([...items, {
        productId: selectedProduct,
        productName: `${product.name} (${product.sku})`,
        quantity: qty,
        price,
        amount
      }]);
    }

    setSelectedProduct('');
    setQuantity('1');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = async () => {
    if (!selectedWarehouse) {
      toast.error('请选择仓库');
      return;
    }

    if (items.length === 0) {
      toast.error('请添加商品');
      return;
    }

    setLoading(true);
    try {
      const data = await postWithAuth<{ success: boolean; message?: string }>('/api/purchase', {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          amount: item.amount
        })),
        supplierId: selectedSupplier || null,
        warehouseId: parseInt(selectedWarehouse),
        totalAmount
      });

      if (data.success) {
        toast.success('进货单创建成功');
        router.push('/purchase');
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (error) {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 检查权限
  if (user?.role === 'user') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">您没有权限访问此页面</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">新建进货单</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 基本信息 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>仓库 *</Label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.name} ({w.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>供应商</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择供应商（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 添加商品 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>添加商品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>商品</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择商品" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} ({p.sku}) - ¥{p.purchase_price}/{p.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label>数量</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 商品明细 */}
        <Card>
          <CardHeader>
            <CardTitle>商品明细</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无商品，请添加商品</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">¥{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{item.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-xl font-bold">
                    合计：¥{totalAmount.toFixed(2)}
                  </div>
                  <Button onClick={handleSubmit} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? '提交中...' : '提交进货单'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
