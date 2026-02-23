import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, generateStrongPassword, savePasswordToFile, validatePasswordStrength } from '@/lib/auth';

// 重置管理员密码 - 仅限服务器端调用
export async function POST() {
  try {
    const client = getSupabaseClient();
    
    // 查找管理员账号
    const { data: admin, error: findError } = await client
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .single();
    
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '管理员账号不存在' },
        { status: 404 }
      );
    }
    
    // 生成新密码
    const password = generateStrongPassword();
    const hashedPassword = await hashPassword(password);
    
    // 更新密码
    const { error } = await client
      .from('users')
      .update({
        password: hashedPassword,
        login_attempts: 0,
        locked_until: null,
        must_change_password: true,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin.id);
    
    if (error) {
      console.error('Reset admin password error:', error);
      return NextResponse.json(
        { success: false, message: '重置密码失败' },
        { status: 500 }
      );
    }
    
    // 保存密码到文件
    await savePasswordToFile(password);
    
    return NextResponse.json({
      success: true,
      message: '管理员密码已重置',
      username: admin.username,
      password,
      warning: '请妥善保管此密码，首次登录后必须修改密码'
    });
  } catch (error) {
    console.error('Reset admin password error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
