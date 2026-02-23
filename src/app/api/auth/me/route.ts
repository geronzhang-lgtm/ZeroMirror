import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // 调试：检查 Cookie 是否被接收
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const userId = cookieStore.get('user_id')?.value;
    const authToken = cookieStore.get('auth_token')?.value;
    
    console.log(`[Auth Me] Cookies received: ${allCookies.length}`);
    console.log(`[Auth Me] All cookie names: ${allCookies.map(c => c.name).join(', ')}`);
    console.log(`[Auth Me] user_id: ${userId ? userId.substring(0, 8) + '...' : 'missing'}`);
    console.log(`[Auth Me] auth_token: ${authToken ? 'present' : 'missing'}`);
    
    // 使用 getUserFromRequest 从 Authorization header 或 Cookie 获取用户
    const user = await getUserFromRequest(request);
    
    if (user) {
      console.log(`[Auth Me] User authenticated: ${user.username}`);
      return NextResponse.json({ success: true, user });
    }
    
    // 认证失败，返回错误
    console.log(`[Auth Me] Authentication failed - no valid user`);
    return NextResponse.json(
      { success: false, message: '未登录' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
