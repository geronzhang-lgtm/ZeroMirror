import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserFromRequest, 
  isAdmin, 
  sanitizeInput,
  validateEmail,
  validatePhone
} from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { logAudit, hasPermission, Permission } from '@/lib/api-security';

// 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以查看用户详情
    if (!hasPermission(currentUser, 'user:read' as Permission)) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }

    // 获取并验证ID
    const { id: userId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json(
        { success: false, message: '无效的用户ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('id, username, name, email, phone, role, is_active, last_login_at, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser || !hasPermission(currentUser, 'user:write' as Permission)) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }

    // 获取并验证ID
    const { id: userId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json(
        { success: false, message: '无效的用户ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, phone, role, isActive } = body;

    // 审计日志
    logAudit(request, 'UPDATE_USER', 'users', userId, { name, email, role, isActive });

    const client = getSupabaseClient();
    
    // 检查是否在修改管理员角色（只有管理员可以）
    if (role) {
      const { data: targetUser } = await client
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (targetUser?.role === 'admin' && !isAdmin(currentUser)) {
        return NextResponse.json(
          { success: false, message: '无法修改管理员角色' },
          { status: 403 }
        );
      }
    }
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (name) {
      updateData.name = sanitizeInput(name, 100);
    }
    
    if (email !== undefined) {
      const sanitizedEmail = email ? sanitizeInput(email, 100) : null;
      if (sanitizedEmail) {
        const emailValidation = validateEmail(sanitizedEmail);
        if (!emailValidation.valid) {
          return NextResponse.json(
            { success: false, message: emailValidation.message },
            { status: 400 }
          );
        }
      }
      updateData.email = sanitizedEmail;
    }
    
    if (phone !== undefined) {
      const sanitizedPhone = phone ? sanitizeInput(phone, 20) : null;
      if (sanitizedPhone) {
        const phoneValidation = validatePhone(sanitizedPhone);
        if (!phoneValidation.valid) {
          return NextResponse.json(
            { success: false, message: phoneValidation.message },
            { status: 400 }
          );
        }
      }
      updateData.phone = sanitizedPhone;
    }
    
    if (role && ['admin', 'manager', 'user'].includes(role)) {
      // 只有管理员可以修改角色
      if (!isAdmin(currentUser)) {
        return NextResponse.json(
          { success: false, message: '只有管理员可以修改用户角色' },
          { status: 403 }
        );
      }
      updateData.role = role;
    }
    
    if (isActive !== undefined) {
      updateData.is_active = Boolean(isActive);
    }

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, name, email, phone, role, is_active, created_at')
      .single();

    if (error) {
      console.error('Update user error:', error.message);
      return NextResponse.json(
        { success: false, message: '更新用户失败' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '用户更新成功',
      user: data
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    
    if (!currentUser || !hasPermission(currentUser, 'user:delete' as Permission)) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }

    // 获取并验证ID
    const { id: userId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return NextResponse.json(
        { success: false, message: '无效的用户ID' },
        { status: 400 }
      );
    }

    // 不能删除自己
    if (currentUser.id === userId) {
      return NextResponse.json(
        { success: false, message: '不能删除自己的账号' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // 检查用户是否存在
    const { data: existingUser, error: checkError } = await client
      .from('users')
      .select('id, username, role')
      .eq('id', userId)
      .single();

    if (checkError || !existingUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 不能删除管理员（只有自己可以删除自己，但前面已经排除了）
    if (existingUser.role === 'admin') {
      return NextResponse.json(
        { success: false, message: '不能删除管理员账号' },
        { status: 403 }
      );
    }

    // 审计日志
    logAudit(request, 'DELETE_USER', 'users', userId, { deletedUsername: existingUser.username });

    // 删除用户
    const { error } = await client
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Delete user error:', error.message);
      return NextResponse.json(
        { success: false, message: '删除用户失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
