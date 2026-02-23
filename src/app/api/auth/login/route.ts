import { NextRequest, NextResponse } from 'next/server';
import { login, getFailedLoginAttempts } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyCaptcha, getStoreStats } from '@/lib/captcha-store';
import { v4 as uuidv4 } from 'uuid';

// 需要验证码的失败次数阈值
const CAPTCHA_THRESHOLD = 3;

// 检测是否是 HTTPS 请求
function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const referer = request.headers.get('referer') || '';
  
  // 检查转发协议
  if (forwardedProto === 'https') return true;
  
  // 检查 referer
  if (referer.startsWith('https://')) return true;
  
  // 默认返回 false（HTTP 环境）
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, captcha } = body;
    
    // 调试：打印请求头信息
    const headers = request.headers;
    const origin = headers.get('origin');
    const referer = headers.get('referer');
    const host = headers.get('host');
    const forwardedProto = headers.get('x-forwarded-proto');
    const forwardedHost = headers.get('x-forwarded-host');
    
    console.log(`[Login API] Request headers - origin: ${origin}, referer: ${referer}, host: ${host}`);
    console.log(`[Login API] Forwarded - proto: ${forwardedProto}, host: ${forwardedHost}`);
    console.log(`[Login API] Request received, username: ${username}, hasCaptcha: ${!!captcha}`);
    
    // 基本验证
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }
    
    // 限制输入长度
    if (username.length > 50 || password.length > 100) {
      return NextResponse.json(
        { success: false, message: '输入内容超出限制' },
        { status: 400 }
      );
    }
    
    // 检查该用户是否需要验证码（失败次数 >= 3）
    const failedAttempts = await getFailedLoginAttempts(username);
    const needCaptcha = failedAttempts >= CAPTCHA_THRESHOLD;
    
    console.log(`[Login API] Failed attempts for ${username}: ${failedAttempts}, needCaptcha: ${needCaptcha}`);
    
    // 如果需要验证码，验证验证码
    if (needCaptcha) {
      if (!captcha) {
        return NextResponse.json(
          { 
            success: false, 
            message: '密码错误次数过多，请输入验证码', 
            needCaptcha: true 
          },
          { status: 400 }
        );
      }
      
      // 从cookie获取验证码sessionId
      const cookieStore = await cookies();
      const sessionId = cookieStore.get('captcha_session')?.value;
      
      console.log(`[Login API] Session ID from cookie: ${sessionId?.substring(0, 8) || 'missing'}...`);
      
      if (!sessionId) {
        console.log('[Login API] No session ID found in cookie');
        return NextResponse.json(
          { 
            success: false, 
            message: '验证码已过期，请刷新验证码后重试', 
            needCaptcha: true 
          },
          { status: 400 }
        );
      }
      
      // 验证验证码
      const captchaValid = verifyCaptcha(sessionId, captcha);
      if (!captchaValid) {
        console.log(`[Login API] Captcha verification failed for session: ${sessionId.substring(0, 8)}...`);
        cookieStore.delete('captcha_session');
        return NextResponse.json(
          { success: false, message: '验证码错误，请刷新后重试', needCaptcha: true },
          { status: 400 }
        );
      }
      
      console.log(`[Login API] Captcha verified successfully`);
      cookieStore.delete('captcha_session');
    }
    
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // 调用登录函数
    const result = await login(username, password, ipAddress, userAgent);
    
    if (result.success) {
      console.log(`[Login API] Login successful for user: ${username}`);
      
      // 检测是否是 HTTPS 请求，动态设置 Cookie
      const isHttps = isHttpsRequest(request);
      console.log(`[Login API] HTTPS detected: ${isHttps}`);
      
      // 使用 user_id 作为 token（简化认证流程）
      const userId = result.user!.id;
      const token = result.token || uuidv4();
      
      // 创建响应对象，返回 token 供前端存储
      const response = NextResponse.json({
        success: true,
        user: result.user,
        token: userId,  // 返回 user_id 作为 token，前端存储在 sessionStorage
        mustChangePassword: result.mustChangePassword,
        message: '登录成功'
      });
      
      // 设置 Cookie（作为备用方案）
      // 使用非 httpOnly 的 Cookie，允许 JavaScript 访问
      const cookieOptionsAccessible = {
        httpOnly: false,  // 允许 JavaScript 访问
        secure: false,    // 允许 HTTP
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      };
      
      // 也设置 httpOnly 的 Cookie 作为备用
      const cookieOptionsHttpOnly = {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' as const : 'lax' as const,
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      };
      
      // 设置可访问的 Cookie
      response.cookies.set('user_id', userId, cookieOptionsAccessible);
      response.cookies.set('auth_token', token, cookieOptionsHttpOnly);
      
      console.log(`[Login API] Cookies set, user_id: ${userId.substring(0, 8)}...`);
      
      return response;
    } else {
      console.log(`[Login API] Login failed: ${result.message}`);
      
      // 获取更新后的失败次数
      const newFailedAttempts = await getFailedLoginAttempts(username);
      const nowNeedCaptcha = newFailedAttempts >= CAPTCHA_THRESHOLD;
      
      return NextResponse.json(
        { 
          success: false, 
          message: result.message, 
          lockedUntil: result.lockedUntil,
          needCaptcha: nowNeedCaptcha,
          failedAttempts: newFailedAttempts
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
