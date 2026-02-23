import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, changePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { oldPassword, newPassword } = body;
    
    console.log(`[Change Password] User: ${user.username}, oldPassword provided: ${!!oldPassword}, newPassword provided: ${!!newPassword}`);
    
    if (!oldPassword || !newPassword) {
      console.log(`[Change Password] Missing password fields`);
      return NextResponse.json(
        { success: false, message: '原密码和新密码不能为空' },
        { status: 400 }
      );
    }
    
    const result = await changePassword(user.id, oldPassword, newPassword);
    
    console.log(`[Change Password] Result: ${JSON.stringify(result)}`);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
