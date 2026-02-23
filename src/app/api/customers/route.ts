import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, sanitizeInput, validatePhone, validateEmail } from '@/lib/auth';
import { getSupabaseClient, execute, query } from '@/storage/database/supabase-client';
import { hasPermission, canWrite, logAudit } from '@/lib/api-security';
import { RowDataPacket } from 'mysql2/promise';

// 获取客户列表 - 支持搜索
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const client = getSupabaseClient();
    
    let queryBuilder = client
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // 搜索功能：支持姓名、手机号、微信号、地址搜索
    if (search) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,wechat.ilike.%${search}%,address.ilike.%${search}%`
      );
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Fetch customers error:', error.message);
      return NextResponse.json({ success: false, message: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      customers: data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 创建客户 - 需要经理或管理员权限
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
    const { name, phone, wechat, address, email, creditLimit } = body;

    // 姓名和手机号必填
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '客户姓名不能为空' }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, message: '手机号不能为空' }, { status: 400 });
    }

    // 清理输入
    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedAddress = address ? sanitizeInput(address, 500) : null;
    const sanitizedWechat = wechat ? sanitizeInput(wechat, 50) : null;

    // 验证电话
    if (phone && !validatePhone(phone)) {
      return NextResponse.json({ success: false, message: '电话号码格式不正确' }, { status: 400 });
    }

    // 验证邮箱
    if (email && !validateEmail(email)) {
      return NextResponse.json({ success: false, message: '邮箱格式不正确' }, { status: 400 });
    }

    // 生成客户编码
    const code = `C${Date.now()}`;

    // 验证信用额度
    let parsedCreditLimit = '0';
    if (creditLimit !== undefined && creditLimit !== null) {
      const numLimit = parseFloat(creditLimit);
      if (isNaN(numLimit) || numLimit < 0 || numLimit > 999999999.99) {
        return NextResponse.json({ success: false, message: '信用额度格式不正确' }, { status: 400 });
      }
      parsedCreditLimit = numLimit.toFixed(2);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('customers')
      .insert({ 
        code, 
        name: sanitizedName, 
        phone: phone || null,
        wechat: sanitizedWechat,
        email: email || null, 
        address: sanitizedAddress, 
        credit_limit: parsedCreditLimit,
        total_purchases: '0',
        purchase_count: 0,
        is_active: true 
      })
      .select()
      .single();

    if (error) {
      console.error('Create customer error:', error.message);
      return NextResponse.json({ success: false, message: '创建客户失败' }, { status: 500 });
    }

    // 记录审计日志
    logAudit(request, 'CREATE_CUSTOMER', 'customers', data.id, { 
      code, 
      name: sanitizedName 
    });

    return NextResponse.json({ success: true, message: '客户创建成功', customer: data });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 更新客户
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    if (!canWrite(currentUser)) {
      return NextResponse.json({ success: false, message: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, phone, wechat, address, email, creditLimit } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: '客户ID不能为空' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: '客户姓名不能为空' }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ success: false, message: '手机号不能为空' }, { status: 400 });
    }

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
      .from('customers')
      .update({
        name: sanitizeInput(name, 100),
        phone: phone || null,
        wechat: wechat ? sanitizeInput(wechat, 50) : null,
        address: address ? sanitizeInput(address, 500) : null,
        email: email || null,
        credit_limit: creditLimit || '0'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update customer error:', error.message);
      return NextResponse.json({ success: false, message: '更新客户失败' }, { status: 500 });
    }

    logAudit(request, 'UPDATE_CUSTOMER', 'customers', id);

    return NextResponse.json({ success: true, message: '客户更新成功', customer: data });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 删除客户（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
    }

    // 只有管理员可以删除
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ success: false, message: '权限不足，需要管理员权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: '客户ID不能为空' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { error } = await client
      .from('customers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Delete customer error:', error.message);
      return NextResponse.json({ success: false, message: '删除客户失败' }, { status: 500 });
    }

    logAudit(request, 'DELETE_CUSTOMER', 'customers', id);

    return NextResponse.json({ success: true, message: '客户已删除' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
