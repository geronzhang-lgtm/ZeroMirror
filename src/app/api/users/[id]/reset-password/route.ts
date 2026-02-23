import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, hashPassword, isAdmin, validatePasswordStrength } from '@/lib/auth';
import { logAudit, hasPermission, Permission } from '@/lib/api-security';

// 重置用户密码
export async function POST(
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
    const { newPassword } = body;

    if (!newPassword) {
      return NextResponse.json(
        { success: false, message: '密码不能为空' },
        { status: 400 }
      );
    }

    // 校验密码强度
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    // 审计日志
    logAudit(request, 'RESET_PASSWORD', 'users', userId);

    const hashedPassword = await hashPassword(newPassword);
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const client = getSupabaseClient();

    // 检查目标用户是否存在
    const { data: targetUser, error: checkError } = await client
      .from('users')
      .select('id, username, role')
      .eq('id', userId)
      .single();

    if (checkError || !targetUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 只有管理员可以重置管理员密码
    if (targetUser.role === 'admin' && !isAdmin(currentUser)) {
      return NextResponse.json(
        { success: false, message: '无法重置管理员密码' },
        { status: 403 }
      );
    }

    // 使用 MySQL 格式的日期
    const now = new Date();
    const mysqlDate = now.toISOString().slice(0, 19).replace('T', ' ');

    const { error } = await client
      .from('users')
      .update({
        password: hashedPassword,
        login_attempts: 0,
        locked_until: null,
        must_change_password: true, // 重置后需要用户修改密码
        updated_at: mysqlDate
      })
      .eq('id', userId);

    if (error) {
      console.error('Reset password error:', error);
      return NextResponse.json(
        { success: false, message: '重置密码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '密码重置成功，用户下次登录时需要修改密码'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
