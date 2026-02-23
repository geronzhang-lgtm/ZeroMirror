import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, sanitizeInput } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';

// 获取仓库列表 - 需要登录
export async function GET(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch warehouses error:', error.message);
      return NextResponse.json(
        { success: false, message: '查询失败' },
        { status: 500 }
      );
    }

    // 转换字段名：location -> address
    const warehouses = (data || []).map((w: { location?: string; [key: string]: unknown }) => ({
      ...w,
      address: w.location,
      location: undefined
    }));

    return NextResponse.json({
      success: true,
      warehouses
    });
  } catch (error) {
    console.error('Get warehouses error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 创建仓库 - 需要经理或管理员权限
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 检查写入权限（经理或管理员）
    if (!canWrite(currentUser)) {
      return NextResponse.json(
        { success: false, message: '权限不足，需要经理或管理员权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    // 支持 address 或 location 字段
    const { name, code, address, location, manager, phone, capacity } = body;
    const finalAddress = address || location;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: '仓库名称和编码不能为空' },
        { status: 400 }
      );
    }

    // 清理输入
    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedCode = sanitizeInput(code, 20);
    const sanitizedAddress = finalAddress ? sanitizeInput(finalAddress, 255) : null;
    const sanitizedManager = manager ? sanitizeInput(manager, 50) : null;

    // 验证编码格式（只允许字母、数字）
    if (!/^[A-Za-z0-9]+$/.test(sanitizedCode)) {
      return NextResponse.json(
        { success: false, message: '仓库编码只能包含字母和数字' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 检查编码是否已存在
    const { data: existing } = await client
      .from('warehouses')
      .select('id')
      .eq('code', sanitizedCode)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, message: '仓库编码已存在' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('warehouses')
      .insert({
        name: sanitizedName,
        code: sanitizedCode,
        location: sanitizedAddress,
        manager: sanitizedManager,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Create warehouse error:', error.message);
      return NextResponse.json(
        { success: false, message: '创建仓库失败' },
        { status: 500 }
      );
    }

    // 记录审计日志
    logAudit(request, 'CREATE_WAREHOUSE', 'warehouses', data.id, { 
      name: sanitizedName, 
      code: sanitizedCode 
    });

    // 转换字段名返回
    const result = {
      ...data,
      address: data.location,
      location: undefined
    };

    return NextResponse.json({
      success: true,
      message: '仓库创建成功',
      warehouse: result
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
