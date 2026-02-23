import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, sanitizeInput, validatePrice } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';

// 获取商品列表 - 需要登录 + product:read权限
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 检查读取权限
    if (!hasPermission(currentUser, 'product:read')) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = sanitizeInput(searchParams.get('search') || '', 100);
    const categoryId = searchParams.get('categoryId');

    const client = getSupabaseClient();
    
    // 构建查询
    let query = client
      .from('products')
      .select(`
        id,
        sku,
        name,
        category_id,
        specification,
        unit,
        purchase_price,
        sale_price,
        min_stock,
        max_stock,
        description,
        is_active,
        created_at,
        updated_at
      `)
      .eq('is_active', true);

    if (search) {
      query = query.or(`sku.ilike.%${search}%,name.ilike.%${search}%`);
    }
    if (categoryId && /^\d+$/.test(categoryId)) {
      query = query.eq('category_id', parseInt(categoryId));
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch products error:', error.message);
      // 如果表不存在，返回空数组
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        return NextResponse.json({ success: true, products: [] });
      }
      return NextResponse.json({ success: false, message: '查询失败' }, { status: 500 });
    }

    // 尝试获取分类信息
    let products = data || [];
    if (products.length > 0) {
      try {
        const categoryIds = [...new Set(products.map((p: { category_id: number }) => p.category_id).filter(Boolean))];
        if (categoryIds.length > 0) {
          const { data: categories } = await client
            .from('categories')
            .select('id, name')
            .in('id', categoryIds);
          
          const categoryMap = new Map((categories || []).map((c: { id: number; name: string }) => [c.id, c]));
          products = products.map((p: { category_id: number }) => ({
            ...p,
            category: categoryMap.get(p.category_id) || null
          }));
        }
      } catch {
        // 忽略分类查询错误
      }
    }

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ success: true, products: [] });
  }
}

// 创建商品 - 需要经理或管理员权限 + product:write权限
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 检查写入权限
    if (!hasPermission(currentUser, 'product:write')) {
      return NextResponse.json({ success: false, message: '权限不足，需要经理或管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, categoryId, specification, unit, purchasePrice, salePrice, minStock, maxStock, description } = body;

    // 验证必填字段
    if (!sku || !name || !unit) {
      return NextResponse.json({ success: false, message: '商品编码、名称和单位为必填项' }, { status: 400 });
    }

    // 清理输入
    const sanitizedSku = sanitizeInput(sku, 50);
    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedSpec = specification ? sanitizeInput(specification, 100) : null;
    const sanitizedUnit = sanitizeInput(unit, 20);
    const sanitizedDesc = description ? sanitizeInput(description, 1000) : null;

    // 验证SKU格式（只允许字母、数字、横杠）
    if (!/^[A-Za-z0-9\-]+$/.test(sanitizedSku)) {
      return NextResponse.json({ success: false, message: '商品编码只能包含字母、数字和横杠' }, { status: 400 });
    }

    // 验证价格
    const purchasePriceValidation = validatePrice(purchasePrice);
    if (!purchasePriceValidation.valid) {
      return NextResponse.json({ success: false, message: '进货价：' + purchasePriceValidation.message }, { status: 400 });
    }

    const salePriceValidation = validatePrice(salePrice);
    if (!salePriceValidation.valid) {
      return NextResponse.json({ success: false, message: '销售价：' + salePriceValidation.message }, { status: 400 });
    }

    // 验证库存范围
    const minStockNum = parseInt(minStock) || 0;
    const maxStockNum = parseInt(maxStock) || 0;
    if (minStockNum < 0 || maxStockNum < 0) {
      return NextResponse.json({ success: false, message: '库存数量不能为负数' }, { status: 400 });
    }
    if (maxStockNum > 0 && minStockNum > maxStockNum) {
      return NextResponse.json({ success: false, message: '最小库存不能大于最大库存' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    // 检查SKU是否已存在
    const { data: existing } = await client.from('products').select('id').eq('sku', sanitizedSku).single();
    if (existing) {
      return NextResponse.json({ success: false, message: '商品编码已存在' }, { status: 400 });
    }

    const { data, error } = await client
      .from('products')
      .insert({
        sku: sanitizedSku,
        name: sanitizedName,
        category_id: categoryId ? parseInt(categoryId) : null,
        specification: sanitizedSpec,
        unit: sanitizedUnit,
        purchase_price: purchasePriceValidation.value.toString(),
        sale_price: salePriceValidation.value.toString(),
        min_stock: minStockNum,
        max_stock: maxStockNum,
        description: sanitizedDesc,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Create product error:', error.message);
      return NextResponse.json({ success: false, message: '创建商品失败' }, { status: 500 });
    }

    // 记录审计日志
    logAudit(request, 'CREATE_PRODUCT', 'products', data.id, { sku: sanitizedSku, name: sanitizedName });

    return NextResponse.json({ success: true, message: '商品创建成功', product: data });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
