'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Package } from 'lucide-react';
import { toast } from 'sonner';
import { getWithAuth, postWithAuth, putWithAuth } from '@/lib/fetch-with-auth';

interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number | null;
  specification: string | null;
  unit: string;
  purchase_price: string;
  sale_price: string;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
  categories?: { id: number; name: string } | null;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const { user: currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    categoryId: '',
    specification: '',
    unit: '个',
    purchasePrice: '0',
    salePrice: '0',
    minStock: '0',
    maxStock: '0',
    description: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      
      const data = await getWithAuth<{ success: boolean; products: Product[] }>(`/api/products?${params}`);
      
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      toast.error('获取商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getWithAuth<{ success: boolean; categories: Category[] }>('/api/categories');
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        sku: product.sku,
        name: product.name,
        categoryId: product.category_id?.toString() || '',
        specification: product.specification || '',
        unit: product.unit,
        purchasePrice: product.purchase_price,
        salePrice: product.sale_price,
        minStock: product.min_stock.toString(),
        maxStock: product.max_stock.toString(),
        description: ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: '',
        name: '',
        categoryId: '',
        specification: '',
        unit: '个',
        purchasePrice: '0',
        salePrice: '0',
        minStock: '0',
        maxStock: '0',
        description: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.sku || !formData.name || !formData.unit) {
        toast.error('请填写必填项');
        return;
      }

      const payload = {
        sku: formData.sku,
        name: formData.name,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        specification: formData.specification || null,
        unit: formData.unit,
        purchasePrice: parseFloat(formData.purchasePrice),
        salePrice: parseFloat(formData.salePrice),
        minStock: parseInt(formData.minStock),
        maxStock: parseInt(formData.maxStock),
        description: formData.description
      };

      const data = await postWithAuth<{ success: boolean; message?: string }>('/api/products', payload);
      
      if (data.success) {
        toast.success('商品创建成功');
        setDialogOpen(false);
        fetchProducts();
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
              <Package className="mr-2 h-8 w-8" />
              商品管理
            </h1>
            <p className="text-gray-600 mt-1">管理商品信息和定价</p>
          </div>
          
          {currentUser?.role !== 'user' && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              新增商品
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索商品编码或名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 商品列表 - 移动端卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">加载中...</div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">暂无商品数据</div>
          ) : (
            products.map((product) => (
              <Card key={product.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.sku}</p>
                    </div>
                    <Badge>{product.unit}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">分类：</span>
                      <span>{product.categories?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">进价：</span>
                      <span className="text-green-600 font-medium">¥{parseFloat(product.purchase_price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">售价：</span>
                      <span className="text-blue-600 font-medium">¥{parseFloat(product.sale_price).toFixed(2)}</span>
                    </div>
                    {product.specification && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">规格：</span>
                        <span>{product.specification}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 新增商品对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增商品</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="sku">商品编码 *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="请输入商品编码"
              />
            </div>
            
            <div>
              <Label htmlFor="name">商品名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入商品名称"
              />
            </div>
            
            <div>
              <Label htmlFor="category">商品分类</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="specification">规格型号</Label>
              <Input
                id="specification"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                placeholder="请输入规格型号"
              />
            </div>
            
            <div>
              <Label htmlFor="unit">单位 *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="个">个</SelectItem>
                  <SelectItem value="件">件</SelectItem>
                  <SelectItem value="箱">箱</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="米">米</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchasePrice">进货价 *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="salePrice">销售价 *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minStock">最小库存</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="maxStock">最大库存</Label>
                <Input
                  id="maxStock"
                  type="number"
                  value={formData.maxStock}
                  onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
