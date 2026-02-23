import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMITS, isDangerousOperation, getClientIp, addSecurityHeaders } from '@/lib/api-security-edge';

// 公开API路径（不需要认证）
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/captcha',
  '/api/init/status',
  '/api/init/test-db',
  '/api/init/tables',
  '/api/init/admin',
];

// 需要严格速率限制的路径
const STRICT_RATE_LIMIT_PATHS = [
  { pattern: /^\/api\/auth\/login$/, config: RATE_LIMITS.login },
  { pattern: /^\/api\/auth\/change-password$/, config: RATE_LIMITS.password },
  { pattern: /^\/api\/admin\/reset-password$/, config: RATE_LIMITS.password },
  { pattern: /^\/api\/users\/[^/]+\/reset-password$/, config: RATE_LIMITS.password },
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const method = request.method;
  
  // 获取请求来源
  const origin = request.headers.get('origin') || '';
  
  // 处理预检请求
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    setCorsHeaders(response, origin);
    addSecurityHeaders(response);
    return response;
  }
  
  // 检查速率限制
  const rateLimitConfig = getRateLimitConfig(path);
  if (rateLimitConfig) {
    const rateCheck = checkRateLimit(request, rateLimitConfig);
    if (!rateCheck.allowed) {
      const response = NextResponse.json(
        { 
          success: false, 
          message: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
      setCorsHeaders(response, origin);
      addSecurityHeaders(response);
      response.headers.set('Retry-After', String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)));
      return response;
    }
  }
  
  // 记录危险操作
  if (isDangerousOperation(method, path)) {
    console.log(`[SECURITY] Dangerous operation: ${method} ${path} from ${getClientIp(request)}`);
  }
  
  // 处理实际请求
  const response = NextResponse.next();
  setCorsHeaders(response, origin);
  addSecurityHeaders(response);
  
  // 添加速率限制信息头
  if (rateLimitConfig) {
    const rateCheck = checkRateLimit(request, rateLimitConfig);
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
  }
  
  return response;
}

/**
 * 获取路径对应的速率限制配置
 */
function getRateLimitConfig(path: string) {
  for (const { pattern, config } of STRICT_RATE_LIMIT_PATHS) {
    if (pattern.test(path)) {
      return config;
    }
  }
  
  // 写入API使用写入限制
  if (path.startsWith('/api/') && !isReadOperation(path)) {
    return RATE_LIMITS.write;
  }
  
  // 一般API使用查询限制
  if (path.startsWith('/api/')) {
    return RATE_LIMITS.query;
  }
  
  return null;
}

/**
 * 判断是否是读取操作
 */
function isReadOperation(path: string): boolean {
  const readPatterns = [
    /^\/api\/products$/,
    /^\/api\/categories$/,
    /^\/api\/warehouses$/,
    /^\/api\/suppliers$/,
    /^\/api\/customers$/,
    /^\/api\/inventory$/,
    /^\/api\/purchase$/,
    /^\/api\/sales$/,
    /^\/api\/users$/,
    /^\/api\/reports/,
    /^\/api\/dashboard/,
  ];
  
  return readPatterns.some(p => p.test(path));
}

function setCorsHeaders(response: NextResponse, origin: string) {
  // 白名单域名检查
  // 支持 localhost、127.0.0.1 以及任何包含这些的 origin
  const allowedPatterns = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/.*\.localhost(:\d+)?$/,
  ];
  
  // 检查 origin 是否匹配白名单模式
  const isAllowed = !origin || 
    allowedPatterns.some(p => p.test(origin)) ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');
  
  // 使用 credentials 时必须指定具体的 origin，不能用 *
  // 如果 origin 有效，返回它；否则返回 *
  const allowedOrigin = isAllowed && origin ? origin : '*';
  
  // 允许跨域请求的来源
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Request-ID');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24小时
  response.headers.set('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
}

// 配置匹配路径
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
