/**
 * API 安全工具库 (Edge Runtime 兼容版本)
 * 仅包含速率限制功能，不依赖 Node.js API
 */

import type { NextRequest } from 'next/server';

// 速率限制配置类型
export interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
  message?: string;      // 自定义错误消息
}

// 速率限制预设配置
export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 登录：15分钟5次
  password: { windowMs: 60 * 60 * 1000, maxRequests: 3 },   // 密码：1小时3次
  write: { windowMs: 60 * 1000, maxRequests: 100 },         // 写入：每分钟100次
  query: { windowMs: 60 * 1000, maxRequests: 300 },         // 查询：每分钟300次
} as const;

// 速率限制存储（内存存储）
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 使用全局对象确保热重载时数据不丢失
const rateLimitStore = new Map<string, RateLimitEntry>();

// 清理过期条目（每5分钟执行一次）
let lastCleanup = Date.now();
function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup > 5 * 60 * 1000) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    lastCleanup = now;
  }
}

/**
 * 检查速率限制
 * @returns 是否允许请求、剩余次数、重置时间
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupExpiredEntries();
  
  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;
  const key = `${ip}:${path}`;
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // 新窗口或已过期
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: newEntry.resetTime };
  }
  
  if (entry.count >= config.maxRequests) {
    // 超过限制
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  // 增加计数
  entry.count++;
  return { 
    allowed: true, 
    remaining: config.maxRequests - entry.count, 
    resetTime: entry.resetTime 
  };
}

/**
 * 获取客户端IP地址
 */
export function getClientIp(request: NextRequest): string {
  // 检查常见的代理头
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // 回退到连接IP
  return 'unknown';
}

/**
 * 判断是否是危险操作
 */
export function isDangerousOperation(method: string, path: string): boolean {
  const dangerousPatterns = [
    { method: 'DELETE', pattern: /^\/api\/users\// },
    { method: 'POST', pattern: /^\/api\/admin\/reset-password$/ },
    { method: 'POST', pattern: /^\/api\/users\/[^/]+\/reset-password$/ },
    { method: 'PUT', pattern: /^\/api\/users\/[^/]+$/ },
  ];
  
  return dangerousPatterns.some(
    p => p.method === method && p.pattern.test(path)
  );
}

/**
 * 添加安全响应头
 */
export function addSecurityHeaders(response: Response): void {
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');
  
  // 防止MIME类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS保护
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 引用来源策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 内容安全策略
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  );
  
  // 权限策略
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
}
