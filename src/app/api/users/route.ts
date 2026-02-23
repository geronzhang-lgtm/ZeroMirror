import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, isAdmin, sanitizeInput } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { v4 as uuidv4 } from 'uuid';

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以查看用户列表
    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const client = getSupabaseClient();
    
    let query = client
      .from('users')
      .select('id, username, name, email, phone, role, is_active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    if (search) {
      const sanitizedSearch = sanitizeInput(search, 50);
      query = query.or(`username.ilike.%${sanitizedSearch}%,name.ilike.%${sanitizedSearch}%`);
    }

    if (role && ['admin', 'manager', 'user'].includes(role)) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get users error:', error.message);
      return NextResponse.json(
        { success: false, message: '获取用户列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: data || []
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, name, email, phone, role } = body;

    // 验证必填字段
    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: '请填写必填项' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 检查用户名是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('username', sanitizeInput(username, 50))
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: '用户名已存在' },
        { status: 400 }
      );
    }

    // 导入密码加密函数
    const { hashPassword, validatePasswordStrength, validateUsername, validateEmail, validatePhone, sanitizeInput: sanitize } = await import('@/lib/auth');

    // 验证用户名格式
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { success: false, message: usernameValidation.message },
        { status: 400 }
      );
    }

    // 验证密码强度
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.message },
        { status: 400 }
      );
    }

    // 验证邮箱
    if (email) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return NextResponse.json(
          { success: false, message: emailValidation.message },
          { status: 400 }
        );
      }
    }

    // 验证电话
    if (phone) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        return NextResponse.json(
          { success: false, message: phoneValidation.message },
          { status: 400 }
        );
      }
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 生成 UUID
    const userId = uuidv4();

    // 创建用户
    const { data, error } = await client
      .from('users')
      .insert({
        id: userId,
        username: sanitize(username, 50),
        password: hashedPassword,
        name: sanitize(name, 100),
        email: email ? sanitize(email, 100) : null,
        phone: phone ? sanitize(phone, 20) : null,
        role: role,
        is_active: true,
        must_change_password: true
      })
      .select('id, username, name, email, phone, role, is_active, created_at')
      .single();

    if (error) {
      console.error('Create user error:', error.message);
      return NextResponse.json(
        { success: false, message: '创建用户失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '用户创建成功',
      user: data
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
