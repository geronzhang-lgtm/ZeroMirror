import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCaptcha } from '@/lib/auth';
import { storeCaptcha, generateSessionId, getStoreStats } from '@/lib/captcha-store';

export async function GET() {
  try {
    const { code, svg } = generateCaptcha();
    
    // 生成一个唯一的sessionId
    const sessionId = generateSessionId();
    
    // 存储验证码
    storeCaptcha(sessionId, code);
    
    // 获取调试信息
    const stats = getStoreStats();
    console.log(`[Captcha API] Generated captcha: ${code}, session: ${sessionId.substring(0, 8)}..., stats:`, stats);
    
    // 将sessionId存储在cookie中
    const cookieStore = await cookies();
    
    // HTTPS 代理访问需要 SameSite=None; Secure=true
    cookieStore.set('captcha_session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 300, // 5分钟
      path: '/'
    });
    
    console.log(`[Captcha API] Cookie set for session: ${sessionId.substring(0, 8)}...`);
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Generate captcha error:', error);
    return NextResponse.json(
      { success: false, message: '生成验证码失败' },
      { status: 500 }
    );
  }
}
