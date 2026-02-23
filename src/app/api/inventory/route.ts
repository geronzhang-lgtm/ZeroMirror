import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';

// 获取库存列表 - 需要登录 + inventory:read权限
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 检查读取权限
    if (!hasPermission(currentUser, 'inventory:read')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search') || '';

    // 验证参数
    if (warehouseId && !/^\d+$/.test(warehouseId)) {
      return NextResponse.json({ success: false, message: '无效的仓库ID' }, { status: 400 });
    }
    if (productId && !/^\d+$/.test(productId)) {
      return NextResponse.json({ success: false, message: '无效的商品ID' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    // 查询库存
    let query = client
      .from('inventory')
      .select('id, product_id, warehouse_id, quantity, created_at, updated_at');

    if (warehouseId) {
      query = query.eq('warehouse_id', parseInt(warehouseId));
    }
    if (productId) {
      query = query.eq('product_id', parseInt(productId));
    }

    let { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Fetch inventory error:', error.message);
      // 如果表不存在，返回空数组
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        return NextResponse.json({ success: true, inventory: [] });
      }
      return NextResponse.json({ success: false, message: '查询失败' }, { status: 500 });
    }

    // 获取商品和仓库信息
    let inventory = data || [];
    
    if (inventory.length > 0) {
      try {
        // 获取所有商品 ID
        const productIds = [...new Set(inventory.map((i: { product_id: string }) => i.product_id).filter(Boolean))];
        // 获取所有仓库 ID
        const warehouseIds = [...new Set(inventory.map((i: { warehouse_id: number }) => i.warehouse_id).filter(Boolean))];
        
        let productMap = new Map<string, { id: string; sku: string; name: string; unit: string; sale_price: string; min_stock: number }>();
        let warehouseMap = new Map<number, { id: number; name: string; code: string }>();
        
        // 查询商品
        if (productIds.length > 0) {
          const { data: products } = await client
            .from('products')
            .select('id, sku, name, unit, sale_price, min_stock')
            .in('id', productIds);
          (products || []).forEach((p: { id: string; sku: string; name: string; unit: string; sale_price: string; min_stock: number }) => {
            productMap.set(p.id, p);
          });
        }
        
        // 查询仓库
        if (warehouseIds.length > 0) {
          const { data: warehouses } = await client
            .from('warehouses')
            .select('id, name, code')
            .in('id', warehouseIds);
          (warehouses || []).forEach((w: { id: number; name: string; code: string }) => {
            warehouseMap.set(w.id, w);
          });
        }
        
        // 组装数据
        inventory = inventory.map((item: { product_id: string; warehouse_id: number }) => {
          const product = productMap.get(item.product_id);
          const warehouse = warehouseMap.get(item.warehouse_id);
          return {
            ...item,
            products: product || null,
            warehouses: warehouse || null
          };
        });
      } catch {
        // 忽略关联查询错误
      }
    }

    // 如果有搜索关键词，过滤商品名称或SKU
    if (search && inventory.length > 0) {
      const sanitizedSearch = search.substring(0, 100).toLowerCase();
      inventory = inventory.filter((item: Record<string, unknown>) => {
        const product = item.products as Record<string, unknown> | null;
        if (!product) return false;
        const name = (product.name as string) || '';
        const sku = (product.sku as string) || '';
        return name.toLowerCase().includes(sanitizedSearch) || sku.toLowerCase().includes(sanitizedSearch);
      });
    }

    return NextResponse.json({ success: true, inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 更新库存 - 需要经理或管理员权限 + inventory:write权限
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 检查写入权限
    if (!hasPermission(currentUser, 'inventory:write')) {
      return NextResponse.json({ success: false, message: '权限不足，需要经理或管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, warehouseId, quantity, type } = body;

    if (!productId || !warehouseId || quantity === undefined) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    // 查询现有库存
    const { data: existing } = await client
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .single();

    let newQuantity = quantity;
    if (existing && type === 'add') {
      newQuantity = (existing.quantity || 0) + quantity;
    } else if (existing && type === 'subtract') {
      newQuantity = Math.max(0, (existing.quantity || 0) - quantity);
    }

    if (newQuantity < 0) {
      return NextResponse.json({ success: false, message: '库存不能为负数' }, { status: 400 });
    }

    let result;
    if (existing) {
      // 更新库存
      const { data, error } = await client
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', existing.id)
        .select()
        .single();
      result = { data, error };
    } else {
      // 创建新库存记录
      const { data, error } = await client
        .from('inventory')
        .insert({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity: newQuantity
        })
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('Update inventory error:', result.error.message);
      return NextResponse.json({ success: false, message: '更新库存失败' }, { status: 500 });
    }

    // 记录审计日志
    logAudit(request, 'UPDATE_INVENTORY', 'inventory', result.data?.id, { 
      productId, 
      warehouseId, 
      quantity: newQuantity,
      type 
    });

    return NextResponse.json({ 
      success: true, 
      message: '库存更新成功',
      inventory: result.data 
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
