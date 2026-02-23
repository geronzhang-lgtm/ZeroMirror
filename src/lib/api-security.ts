/**
 * API 安全工具库
 * 提供鉴权、速率限制、输入验证等安全功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, User } from './auth';

// ============== 速率限制配置 ==============

interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

// 内存存储（生产环境建议使用 Redis）
const rateLimitStore = new Map<string, RateLimitEntry>();

// 清理过期条目（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// 默认速率限制配置
export const RATE_LIMITS = {
  // 登录接口 - 严格限制
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  // 密码相关 - 非常严格
  password: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  // 一般API - 中等限制
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  // 查询API - 宽松限制
  query: { windowMs: 60 * 1000, maxRequests: 200 },
  // 写入API - 较严格
  write: { windowMs: 60 * 1000, maxRequests: 30 },
  // 公开API - 宽松限制
  public: { windowMs: 60 * 1000, maxRequests: 60 },
};

/**
 * 速率限制检查
 */
export function checkRateLimit(
  request: NextRequest, 
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = config.keyGenerator 
    ? config.keyGenerator(request) 
    : getDefaultRateLimitKey(request);
  
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // 如果没有记录或已过期，创建新记录
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false
    };
    rateLimitStore.set(key, newEntry);
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: newEntry.resetTime };
  }
  
  // 检查是否超出限制
  if (entry.count >= config.maxRequests) {
    entry.blocked = true;
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  // 增加计数
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * 获取默认速率限制Key（基于IP）
 */
function getDefaultRateLimitKey(request: NextRequest): string {
  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;
  return `rate:${ip}:${path}`;
}

/**
 * 获取客户端IP
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  return 'unknown';
}

// ============== 权限检查 ==============

export type Permission = 
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'product:read'
  | 'product:write'
  | 'product:delete'
  | 'inventory:read'
  | 'inventory:write'
  | 'order:read'
  | 'order:write'
  | 'order:delete'
  | 'report:read'
  | 'system:admin';

// 角色权限映射
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'user:read', 'user:write', 'user:delete',
    'product:read', 'product:write', 'product:delete',
    'inventory:read', 'inventory:write',
    'order:read', 'order:write', 'order:delete',
    'report:read',
    'system:admin'
  ],
  manager: [
    'product:read', 'product:write',
    'inventory:read', 'inventory:write',
    'order:read', 'order:write',
    'report:read'
  ],
  user: [
    'product:read',
    'inventory:read',
    'order:read'
  ]
};

/**
 * 检查用户是否拥有指定权限
 */
export function hasPermission(user: User, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
}

/**
 * 检查用户是否拥有任意指定权限
 */
export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

/**
 * 检查用户是否拥有所有指定权限
 */
export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

// ============== API 鉴权装饰器 ==============

export interface AuthOptions {
  required?: boolean;           // 是否需要登录
  permissions?: Permission[];   // 需要的权限
  rateLimit?: RateLimitConfig;  // 速率限制
  requireAll?: boolean;         // 是否需要所有权限
}

/**
 * API 鉴权包装函数
 */
export async function withAuth(
  request: NextRequest,
  options: AuthOptions = {},
  handler: (user: User | null) => Promise<NextResponse>
): Promise<NextResponse> {
  // 速率限制检查
  if (options.rateLimit) {
    const rateCheck = checkRateLimit(request, options.rateLimit);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          message: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(options.rateLimit.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetTime / 1000))
          }
        }
      );
    }
  }

  // 获取当前用户
  const user = await getCurrentUser();

  // 检查登录要求
  if (options.required !== false && !user) {
    return NextResponse.json(
      { success: false, message: '未登录' },
      { status: 401 }
    );
  }

  // 检查权限要求
  if (user && options.permissions && options.permissions.length > 0) {
    const hasAccess = options.requireAll 
      ? hasAllPermissions(user, options.permissions)
      : hasAnyPermission(user, options.permissions);
    
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }
  }

  return handler(user);
}

// ============== 安全响应头 ==============

/**
 * 添加安全响应头
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');
  
  // 防止MIME类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS 保护
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 引用策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 权限策略
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // 内容安全策略（API响应）
  response.headers.set('Content-Security-Policy', "default-src 'self'");
  
  return response;
}

// ============== 输入验证工具 ==============

/**
 * 验证ID格式
 */
export function validateId(id: string, type: 'uuid' | 'number' = 'uuid'): boolean {
  if (type === 'uuid') {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }
  return /^\d+$/.test(id);
}

/**
 * 验证金额
 */
export function validateAmount(amount: unknown): { valid: boolean; value?: number; message?: string } {
  if (amount === undefined || amount === null || amount === '') {
    return { valid: true, value: 0 };
  }
  
  const num = parseFloat(String(amount));
  
  if (isNaN(num)) {
    return { valid: false, message: '金额格式不正确' };
  }
  
  if (num < 0) {
    return { valid: false, message: '金额不能为负数' };
  }
  
  if (num > 999999999.99) {
    return { valid: false, message: '金额超出限制' };
  }
  
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * 验证数量
 */
export function validateQuantity(quantity: unknown): { valid: boolean; value?: number; message?: string } {
  if (quantity === undefined || quantity === null || quantity === '') {
    return { valid: true, value: 0 };
  }
  
  const num = parseFloat(String(quantity));
  
  if (isNaN(num)) {
    return { valid: false, message: '数量格式不正确' };
  }
  
  if (num < 0) {
    return { valid: false, message: '数量不能为负数' };
  }
  
  if (num > 999999999) {
    return { valid: false, message: '数量超出限制' };
  }
  
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * 验证SKU格式
 */
export function validateSku(sku: string): { valid: boolean; message?: string } {
  if (!sku) {
    return { valid: false, message: 'SKU不能为空' };
  }
  
  if (sku.length > 50) {
    return { valid: false, message: 'SKU长度不能超过50个字符' };
  }
  
  if (!/^[A-Za-z0-9\-]+$/.test(sku)) {
    return { valid: false, message: 'SKU只能包含字母、数字和横杠' };
  }
  
  return { valid: true };
}

// ============== 审计日志 ==============

interface AuditLog {
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

const auditLogs: AuditLog[] = [];

/**
 * 记录审计日志
 */
export function logAudit(
  request: NextRequest,
  action: string,
  resource: string,
  resourceId?: string,
  details?: Record<string, unknown>
): void {
  const userId = request.cookies.get('user_id')?.value || null;
  
  const log: AuditLog = {
    userId,
    action,
    resource,
    resourceId,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    timestamp: new Date(),
    details
  };
  
  auditLogs.push(log);
  
  // 保留最近1000条日志
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }
  
  // 输出到控制台（生产环境应写入数据库或日志服务）
  console.log('[AUDIT]', JSON.stringify(log));
}

// ============== 鉴权中间件工厂 ==============

/**
 * 创建需要登录的API处理函数
 */
export function requireAuth(
  handler: (user: User, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }
    return handler(user, request);
  };
}

/**
 * 创建需要特定权限的API处理函数
 */
export function requirePermission(
  permission: Permission,
  handler: (user: User, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }
    
    if (!hasPermission(user, permission)) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      );
    }
    
    return handler(user, request);
  };
}

/**
 * 创建需要管理员权限的API处理函数
 */
export function requireAdmin(
  handler: (user: User, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: '需要管理员权限' },
        { status: 403 }
      );
    }
    
    return handler(user, request);
  };
}

/**
 * 创建需要经理或管理员权限的API处理函数
 */
export function requireManager(
  handler: (user: User, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { success: false, message: '需要经理或管理员权限' },
        { status: 403 }
      );
    }
    
    return handler(user, request);
  };
}

/**
 * 检查用户是否有写入权限（经理或管理员）
 */
export function canWrite(user: User): boolean {
  return user.role === 'admin' || user.role === 'manager';
}

/**
 * 检查用户是否有删除权限（仅管理员）
 */
export function canDelete(user: User): boolean {
  return user.role === 'admin';
}

/**
 * API鉴权结果类型
 */
export interface AuthResult {
  authorized: boolean;
  user: User | null;
  error?: {
    status: number;
    message: string;
  };
}

/**
 * 统一鉴权检查函数
 * @param request NextRequest对象
 * @param options 鉴权选项
 * @returns 鉴权结果
 */
export async function checkAuth(
  request: NextRequest,
  options: {
    required?: boolean;           // 是否需要登录（默认true）
    permissions?: Permission[];   // 需要的权限列表
    requireAll?: boolean;         // 是否需要所有权限（默认false，任意一个即可）
    roles?: ('admin' | 'manager' | 'user')[];  // 允许的角色
  } = {}
): Promise<AuthResult> {
  const { required = true, permissions = [], requireAll = false, roles } = options;
  
  // 获取当前用户
  const user = await getCurrentUser();
  
  // 检查是否需要登录
  if (required && !user) {
    return {
      authorized: false,
      user: null,
      error: { status: 401, message: '未登录' }
    };
  }
  
  // 如果不需要登录且没有用户，直接返回成功
  if (!user) {
    return { authorized: true, user: null };
  }
  
  // 检查角色限制
  if (roles && roles.length > 0) {
    if (!roles.includes(user.role as 'admin' | 'manager' | 'user')) {
      return {
        authorized: false,
        user,
        error: { status: 403, message: '权限不足' }
      };
    }
  }
  
  // 检查权限限制
  if (permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(user, permissions)
      : hasAnyPermission(user, permissions);
    
    if (!hasAccess) {
      return {
        authorized: false,
        user,
        error: { status: 403, message: '权限不足' }
      };
    }
  }
  
  return { authorized: true, user };
}

/**
 * 快速鉴权响应包装器
 */
export function unauthorizedResponse(message: string = '未登录'): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status: 401 }
  );
}

export function forbiddenResponse(message: string = '权限不足'): NextResponse {
  return NextResponse.json(
    { success: false, message },
    { status: 403 }
  );
}

/**
 * 获取审计日志
 */
export function getAuditLogs(limit: number = 100): AuditLog[] {
  return auditLogs.slice(-limit);
}

// ============== 敏感操作保护 ==============

/**
 * 敏感操作需要二次验证
 */
export function requireReauth(user: User, operation: string): boolean {
  // 在实际应用中，可以检查：
  // 1. 距离上次登录的时间
  // 2. 是否有敏感操作标记
  // 3. IP地址是否变化
  
  // 简单实现：管理员执行敏感操作时记录日志
  console.log(`[SENSITIVE] User ${user.username} (${user.role}) performing: ${operation}`);
  return true;
}

/**
 * 检查是否是危险操作
 */
export function isDangerousOperation(method: string, path: string): boolean {
  const dangerousPatterns = [
    { method: 'DELETE', pattern: /\/api\/users\// },
    { method: 'POST', pattern: /\/api\/init\// },
    { method: 'POST', pattern: /\/api\/admin\// },
  ];
  
  return dangerousPatterns.some(
    p => p.method === method && p.pattern.test(path)
  );
}
