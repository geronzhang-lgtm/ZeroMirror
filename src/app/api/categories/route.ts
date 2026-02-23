import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, sanitizeInput } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';

// 获取分类列表 - 需要登录
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Fetch categories error:', error.message);
      // 如果表不存在，返回空数组
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        return NextResponse.json({ success: true, categories: [] });
      }
      return NextResponse.json({ success: false, message: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, categories: data || [] });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ success: true, categories: [] });
  }
}

// 创建分类 - 需要经理或管理员权限 + product:write权限
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
    const { name, parentId, description } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: '分类名称不能为空' }, { status: 400 });
    }

    // 清理输入
    const sanitizedName = sanitizeInput(name, 50);
    const sanitizedDesc = description ? sanitizeInput(description, 500) : null;

    // 验证父分类ID
    if (parentId && !/^\d+$/.test(parentId)) {
      return NextResponse.json({ success: false, message: '无效的父分类ID' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('categories')
      .insert({ 
        name: sanitizedName, 
        parent_id: parentId ? parseInt(parentId) : null, 
        description: sanitizedDesc 
      })
      .select()
      .single();

    if (error) {
      console.error('Create category error:', error.message);
      return NextResponse.json({ success: false, message: '创建分类失败' }, { status: 500 });
    }

    // 记录审计日志
    logAudit(request, 'CREATE_CATEGORY', 'categories', data.id, { name: sanitizedName });

    return NextResponse.json({ success: true, message: '分类创建成功', category: data });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
