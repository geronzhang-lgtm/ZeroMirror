import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, sanitizeInput, validatePhone, validateEmail } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';

// 获取供应商列表 - 需要登录
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch suppliers error:', error.message);
      return NextResponse.json({ success: false, message: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, suppliers: data });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 创建供应商 - 需要经理或管理员权限
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 检查写入权限
    if (!canWrite(currentUser)) {
      return NextResponse.json({ success: false, message: '权限不足，需要经理或管理员权限' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, contact, phone, email, address } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, message: '供应商编码和名称不能为空' }, { status: 400 });
    }

    // 清理输入
    const sanitizedCode = sanitizeInput(code, 20);
    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedContact = contact ? sanitizeInput(contact, 50) : null;
    const sanitizedAddress = address ? sanitizeInput(address, 500) : null;

    // 验证电话
    if (phone && !validatePhone(phone)) {
      return NextResponse.json({ success: false, message: '电话号码格式不正确' }, { status: 400 });
    }

    // 验证邮箱
    if (email && !validateEmail(email)) {
      return NextResponse.json({ success: false, message: '邮箱格式不正确' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('suppliers')
      .insert({ 
        code: sanitizedCode, 
        name: sanitizedName, 
        contact: sanitizedContact, 
        phone: phone || null, 
        email: email || null, 
        address: sanitizedAddress, 
        is_active: true 
      })
      .select()
      .single();

    if (error) {
      console.error('Create supplier error:', error.message);
      return NextResponse.json({ success: false, message: '创建供应商失败' }, { status: 500 });
    }

    // 记录审计日志
    logAudit(request, 'CREATE_SUPPLIER', 'suppliers', data.id, { 
      code: sanitizedCode, 
      name: sanitizedName 
    });

    return NextResponse.json({ success: true, message: '供应商创建成功', supplier: data });
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
