import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, sanitizeInput } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { canWrite, logAudit } from '@/lib/api-security';

// 获取单个仓库
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 获取并验证ID
    const { id: warehouseId } = await params;
    if (!/^\d+$/.test(warehouseId)) {
      return NextResponse.json({ success: false, message: '无效的仓库ID' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('warehouses')
      .select('*')
      .eq('id', parseInt(warehouseId))
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 });
    }

    // 转换字段名
    const result = {
      ...data,
      address: data.location,
      location: undefined
    };

    return NextResponse.json({ success: true, warehouse: result });
  } catch (error) {
    console.error('Get warehouse error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 更新仓库
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser || !canWrite(currentUser)) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 });
    }

    // 获取并验证ID
    const { id: warehouseId } = await params;
    if (!/^\d+$/.test(warehouseId)) {
      return NextResponse.json({ success: false, message: '无效的仓库ID' }, { status: 400 });
    }

    const body = await request.json();
    // 支持 address 或 location 字段
    const { name, code, address, location, manager, phone, capacity, isActive } = body;
    const finalAddress = address || location;

    // 清理输入
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    if (name) {
      updateData.name = sanitizeInput(name, 100);
    }
    if (code) {
      updateData.code = sanitizeInput(code, 20);
    }
    if (finalAddress !== undefined) {
      updateData.location = finalAddress ? sanitizeInput(finalAddress, 200) : null;
    }
    if (manager !== undefined) {
      updateData.manager = manager ? sanitizeInput(manager, 50) : null;
    }
    if (isActive !== undefined) {
      updateData.is_active = Boolean(isActive);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('warehouses')
      .update(updateData)
      .eq('id', parseInt(warehouseId))
      .select()
      .single();

    if (error) {
      console.error('Update warehouse error:', error.message);
      return NextResponse.json({ success: false, message: '更新仓库失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 });
    }

    // 记录审计日志
    logAudit(request, 'UPDATE_WAREHOUSE', 'warehouses', warehouseId, updateData);

    // 转换字段名返回
    const result = {
      ...data,
      address: data.location,
      location: undefined
    };

    return NextResponse.json({ success: true, message: '仓库更新成功', warehouse: result });
  } catch (error) {
    console.error('Update warehouse error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 删除仓库
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser || !canWrite(currentUser)) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 });
    }

    // 获取并验证ID
    const { id: warehouseId } = await params;
    if (!/^\d+$/.test(warehouseId)) {
      return NextResponse.json({ success: false, message: '无效的仓库ID' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    // 检查仓库是否存在
    const { data: existingWarehouse, error: checkError } = await client
      .from('warehouses')
      .select('id, name')
      .eq('id', parseInt(warehouseId))
      .single();

    if (checkError || !existingWarehouse) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 });
    }

    // 检查是否有库存关联
    const { data: inventory } = await client
      .from('inventory')
      .select('id')
      .eq('warehouse_id', parseInt(warehouseId))
      .limit(1);

    if (inventory && inventory.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: '该仓库存在库存记录，无法删除' 
      }, { status: 400 });
    }

    const { error } = await client
      .from('warehouses')
      .delete()
      .eq('id', parseInt(warehouseId));

    if (error) {
      console.error('Delete warehouse error:', error.message);
      return NextResponse.json({ success: false, message: '删除仓库失败' }, { status: 500 });
    }

    // 记录审计日志
    logAudit(request, 'DELETE_WAREHOUSE', 'warehouses', warehouseId, { name: existingWarehouse.name });

    return NextResponse.json({ success: true, message: '仓库删除成功' });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
