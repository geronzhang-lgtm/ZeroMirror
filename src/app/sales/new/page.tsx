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
import { ArrowLeft, Plus, Trash2, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getWithAuth, postWithAuth } from '@/lib/fetch-with-auth';

interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  sale_price: string;
}

interface Warehouse {
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

interface CustomerInfo {
  name: string;
  phone: string;
  wechat: string;
  address: string;
}

interface FormErrors {
  customerName?: string;
  customerPhone?: string;
  warehouse?: string;
  product?: string;
}

export default function NewSalesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  
  // 客户信息字段
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    wechat: '',
    address: ''
  });
  
  // 商品搜索
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // 表单错误
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
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

  // 过滤商品列表
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // 验证手机号格式
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!customerInfo.name.trim()) {
      newErrors.customerName = '请输入客户姓名';
    }
    
    if (!customerInfo.phone.trim()) {
      newErrors.customerPhone = '请输入手机号';
    } else if (!validatePhone(customerInfo.phone)) {
      newErrors.customerPhone = '请输入正确的手机号格式';
    }
    
    if (!selectedWarehouse) {
      newErrors.warehouse = '请选择仓库';
    }
    
    if (items.length === 0) {
      newErrors.product = '请添加商品';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error('请选择商品');
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    const qty = parseInt(quantity) || 1;
    const price = parseFloat(product.sale_price) || 0;
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
    setProductSearch('');
    setErrors(prev => ({ ...prev, product: undefined }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('请完善必填信息');
      return;
    }

    setLoading(true);
    try {
      const data = await postWithAuth<{ success: boolean; message?: string }>('/api/sales', {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          amount: item.amount
        })),
        customerInfo: {
          name: customerInfo.name.trim(),
          phone: customerInfo.phone.trim(),
          wechat: customerInfo.wechat.trim(),
          address: customerInfo.address.trim()
        },
        warehouseId: parseInt(selectedWarehouse),
        totalAmount
      });

      if (data.success) {
        toast.success('销售单创建成功');
        router.push('/sales');
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (error) {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 选择商品
  const handleSelectProduct = (productId: string) => {
    setSelectedProduct(productId);
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      setProductSearch(`${product.name} (${product.sku})`);
    }
    setShowProductDropdown(false);
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
          <h1 className="text-2xl font-bold">新建销售单</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 客户信息 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>客户信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className={errors.customerName ? 'text-red-500' : ''}>
                  姓名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入客户姓名"
                  value={customerInfo.name}
                  onChange={(e) => {
                    setCustomerInfo({ ...customerInfo, name: e.target.value });
                    if (errors.customerName) {
                      setErrors({ ...errors, customerName: undefined });
                    }
                  }}
                  className={errors.customerName ? 'border-red-500' : ''}
                />
                {errors.customerName && (
                  <p className="text-sm text-red-500">{errors.customerName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className={errors.customerPhone ? 'text-red-500' : ''}>
                  手机号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="请输入手机号"
                  value={customerInfo.phone}
                  onChange={(e) => {
                    setCustomerInfo({ ...customerInfo, phone: e.target.value });
                    if (errors.customerPhone) {
                      setErrors({ ...errors, customerPhone: undefined });
                    }
                  }}
                  className={errors.customerPhone ? 'border-red-500' : ''}
                />
                {errors.customerPhone && (
                  <p className="text-sm text-red-500">{errors.customerPhone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>微信号</Label>
                <Input
                  placeholder="请输入微信号（选填）"
                  value={customerInfo.wechat}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, wechat: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>地址</Label>
                <Input
                  placeholder="请输入地址（选填）"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 仓库和添加商品 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>商品信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 仓库选择 */}
              <div className="space-y-2">
                <Label className={errors.warehouse ? 'text-red-500' : ''}>
                  仓库 <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedWarehouse} onValueChange={(value) => {
                  setSelectedWarehouse(value);
                  if (errors.warehouse) {
                    setErrors({ ...errors, warehouse: undefined });
                  }
                }}>
                  <SelectTrigger className={errors.warehouse ? 'border-red-500' : ''}>
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
                {errors.warehouse && (
                  <p className="text-sm text-red-500">{errors.warehouse}</p>
                )}
              </div>

              {/* 商品搜索和选择 */}
              <div className="space-y-2">
                <Label className={errors.product ? 'text-red-500' : ''}>
                  商品 {items.length === 0 && <span className="text-red-500">*</span>}
                </Label>
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="搜索商品名称或SKU..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          setSelectedProduct('');
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        className={`pl-10 ${errors.product ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {/* 商品下拉列表 */}
                    {showProductDropdown && productSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(p => (
                            <div
                              key={p.id}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                              onClick={() => handleSelectProduct(p.id.toString())}
                            >
                              <span>{p.name} ({p.sku})</span>
                              <span className="text-gray-500">¥{p.sale_price}/{p.unit}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500 text-center">
                            未找到匹配的商品
                          </div>
                        )}
                      </div>
                    )}
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
                  <Button onClick={handleAddItem} disabled={!selectedProduct}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加
                  </Button>
                </div>
                {errors.product && (
                  <p className="text-sm text-red-500">{errors.product}</p>
                )}
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
                    {loading ? '提交中...' : '提交销售单'}
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
