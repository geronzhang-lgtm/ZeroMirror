import { getSupabaseClient } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { chmod } from 'fs/promises';

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const MAX_PASSWORD_GENERATE_ATTEMPTS = 100; // 防止死循环

export interface User {
  id: string;
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'manager' | 'user';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  mustChangePassword?: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  lockedUntil?: string;
  mustChangePassword?: boolean;
}

export interface PasswordStrengthResult {
  valid: boolean;
  score: number;
  message: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    noConsecutive: boolean;
  };
}

// 输入清理函数 - 防止注入攻击
export function sanitizeInput(input: string, maxLength: number = 255): string {
  if (!input) return '';
  // 移除控制字符
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  // 限制长度
  sanitized = sanitized.substring(0, maxLength);
  return sanitized.trim();
}

// 验证用户名格式
export function validateUsername(username: string): { valid: boolean; message: string } {
  if (!username || username.length < 3 || username.length > 50) {
    return { valid: false, message: '用户名长度必须在3-50个字符之间' };
  }
  // 只允许字母、数字、下划线
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: '用户名只能包含字母、数字和下划线' };
  }
  return { valid: true, message: '' };
}

// 验证邮箱格式
export function validateEmail(email: string | null): { valid: boolean; message: string } {
  if (!email) return { valid: true, message: '' };
  if (email.length > 100) {
    return { valid: false, message: '邮箱长度不能超过100个字符' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }
  return { valid: true, message: '' };
}

// 验证电话格式
export function validatePhone(phone: string | null): { valid: boolean; message: string } {
  if (!phone) return { valid: true, message: '' };
  if (phone.length > 20) {
    return { valid: false, message: '电话长度不能超过20个字符' };
  }
  // 只允许数字、空格、横杠、括号、加号
  if (!/^[\d\s\-\(\)\+]+$/.test(phone)) {
    return { valid: false, message: '电话格式不正确' };
  }
  return { valid: true, message: '' };
}

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// 密码验证
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // 防止时序攻击 - 使用恒定时间比较
  return bcrypt.compare(password, hashedPassword);
}

// 生成会话token
export function generateToken(): string {
  return uuidv4();
}

// 生成随机验证码（4位字母+数字混淆）
export function generateCaptcha(): { code: string; svg: string } {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆的字符：O, 0, I, 1, L
  let code = '';
  
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 生成SVG验证码图片
  const svg = generateCaptchaSvg(code);
  
  return { code, svg };
}

// XSS安全转义函数
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 生成验证码SVG
function generateCaptchaSvg(code: string): string {
  const width = 120;
  const height = 50;
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  
  // 背景
  svg += `<rect width="100%" height="100%" fill="#f0f0f0"/>`;
  
  // 干扰线
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    svg += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="1" opacity="0.5"/>`;
  }
  
  // 干扰点
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = colors[Math.floor(Math.random() * colors.length)];
    svg += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1" fill="${color}" opacity="0.5"/>`;
  }
  
  // 文字 - 使用转义防止XSS（虽然code只包含安全字符）
  const chars = code.split('');
  chars.forEach((char, i) => {
    const x = 20 + i * 25;
    const y = 32;
    const rotate = (Math.random() - 0.5) * 30;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const fontSize = 24 + Math.random() * 8;
    
    svg += `<text x="${x}" y="${y}" 
      font-family="Arial, sans-serif" 
      font-size="${fontSize.toFixed(2)}" 
      font-weight="bold"
      fill="${color}"
      transform="rotate(${rotate.toFixed(2)}, ${x}, ${y})"
    >${escapeXml(char)}</text>`;
  });
  
  svg += '</svg>';
  
  return svg;
}

// 生成强密码（8位随机字母+数字+特殊符号，不连续）
export function generateStrongPassword(): string {
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // 排除易混淆的 l, i
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 排除易混淆的 I, L, O
  const numbers = '23456789'; // 排除 0, 1
  const special = '@#$%^&*!?';
  
  let password = '';
  const allChars = lowercase + uppercase + numbers + special;
  
  // 确保每种类型至少有一个
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));
  
  // 剩余4位随机生成
  for (let i = 0; i < 4; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // 打乱顺序
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  // 检查是否有连续字符，如果有则重新打乱（限制最大尝试次数防止死循环）
  let attempts = 0;
  while (hasConsecutiveChars(password) && attempts < MAX_PASSWORD_GENERATE_ATTEMPTS) {
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    attempts++;
  }
  
  // 如果仍然有连续字符，手动替换
  if (hasConsecutiveChars(password)) {
    const replaceChars = 'XYZWQ';
    let newPassword = '';
    for (let i = 0; i < password.length; i++) {
      if (i > 0 && Math.abs(password.charCodeAt(i) - password.charCodeAt(i-1)) === 1) {
        newPassword += replaceChars.charAt(Math.floor(Math.random() * replaceChars.length));
      } else {
        newPassword += password[i];
      }
    }
    password = newPassword;
  }
  
  return password;
}

// 检查是否有连续字符
function hasConsecutiveChars(str: string): boolean {
  for (let i = 0; i < str.length - 1; i++) {
    const current = str.charCodeAt(i);
    const next = str.charCodeAt(i + 1);
    
    // 检查是否连续（数字、字母）
    if (Math.abs(current - next) === 1) {
      // 排除特殊符号的情况
      if (
        (current >= 48 && current <= 57) || // 数字
        (current >= 65 && current <= 90) || // 大写字母
        (current >= 97 && current <= 122)   // 小写字母
      ) {
        if (
          (next >= 48 && next <= 57) || // 数字
          (next >= 65 && next <= 90) || // 大写字母
          (next >= 97 && next <= 122)   // 小写字母
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

// 校验密码强度
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    noConsecutive: !hasConsecutiveChars(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  let message = '';
  const failedChecks = Object.entries(checks)
    .filter(([_, passed]) => !passed)
    .map(([check]) => {
      switch(check) {
        case 'length': return '长度至少8位';
        case 'uppercase': return '包含大写字母';
        case 'lowercase': return '包含小写字母';
        case 'number': return '包含数字';
        case 'special': return '包含特殊符号';
        case 'noConsecutive': return '不能有连续字符';
        default: return check;
      }
    });
  
  if (failedChecks.length > 0) {
    message = `密码要求：${failedChecks.join('、')}`;
  } else {
    message = '密码强度符合要求';
  }
  
  return {
    valid: score >= 5, // 至少满足5项
    score,
    message,
    checks
  };
}

// 保存密码到文件（设置安全权限）
export async function savePasswordToFile(password: string): Promise<void> {
  try {
    const filePath = join(process.cwd(), 'su.passwd');
    const content = `# 零镜进销存管理员密码
# 生成时间: ${new Date().toLocaleString('zh-CN')}
# 警告: 请妥善保管此文件，修改密码后建议立即删除此文件

管理员密码: ${password}

# 使用说明:
# 1. 使用管理员账号登录系统
# 2. 首次登录会强制要求修改密码
# 3. 修改密码后此文件中的密码将失效
# 4. 建议修改密码后立即删除此文件
`;
    await writeFile(filePath, content, 'utf-8');
    
    // 设置文件权限为600（仅所有者可读写）
    try {
      await chmod(filePath, 0o600);
    } catch {
      // Windows系统不支持chmod，忽略错误
    }
  } catch (error) {
    console.error('Failed to save password file:', error);
  }
}

// 获取用户登录失败次数
export async function getFailedLoginAttempts(username: string): Promise<number> {
  try {
    const client = getSupabaseClient();
    
    const { data: user, error } = await client
      .from('users')
      .select('login_attempts')
      .eq('username', sanitizeInput(username, 50))
      .single();
    
    if (error || !user) {
      return 0;
    }
    
    return user.login_attempts || 0;
  } catch {
    return 0;
  }
}

// 登录验证（验证码验证已在API层完成）
export async function login(
  username: string, 
  password: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<LoginResult> {
  // 清理输入
  username = sanitizeInput(username, 50);
  password = sanitizeInput(password, 100); // 限制密码长度防止DoS
  
  const client = getSupabaseClient();
  
  // 查询用户
  const { data: user, error } = await client
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  console.log(`[Login] Query result - error: ${error?.message || 'none'}, user: ${user ? user.username : 'not found'}`);
  
  if (error) {
    console.log(`[Login] Query error:`, error);
  }
  
  if (user) {
    console.log(`[Login] User found - id: ${user.id}, password field exists: ${!!user.password}, password length: ${user.password?.length || 0}`);
  }

  if (error || !user) {
    // 记录登录失败日志（不透露用户是否存在）
    await logLoginAttempt(null, ipAddress, userAgent, false, '认证失败');
    return { success: false, message: '用户名或密码错误' };
  }

  // 检查账户是否被锁定
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await logLoginAttempt(user.id, ipAddress, userAgent, false, '账户已锁定');
    return { 
      success: false, 
      message: `账户已被锁定，请稍后再试`,
      lockedUntil: user.locked_until
    };
  }

  // 检查账户是否激活
  if (!user.is_active) {
    await logLoginAttempt(user.id, ipAddress, userAgent, false, '账户未激活');
    return { success: false, message: '账户已被禁用，请联系管理员' };
  }

  // 验证密码
  console.log(`[Login] Verifying password for user ${username}`);
  const isValid = await verifyPassword(password, user.password);
  console.log(`[Login] Password verification result: ${isValid}`);
  
  if (!isValid) {
    // 登录失败，增加失败次数
    const newAttempts = user.login_attempts + 1;
    const updateData: any = { login_attempts: newAttempts };
    
    // 如果达到最大尝试次数，锁定账户
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
      updateData.locked_until = lockUntil.toISOString();
      
      await client
        .from('users')
        .update(updateData)
        .eq('id', user.id);
      
      await logLoginAttempt(user.id, ipAddress, userAgent, false, '密码错误次数过多，账户已锁定');
      return { 
        success: false, 
        message: `密码错误次数过多，账户已被锁定${LOCK_DURATION_MINUTES}分钟`,
        lockedUntil: updateData.locked_until
      };
    }
    
    await client
      .from('users')
      .update(updateData)
      .eq('id', user.id);
    
    await logLoginAttempt(user.id, ipAddress, userAgent, false, '密码错误');
    return { 
      success: false, 
      message: `用户名或密码错误，还剩 ${MAX_LOGIN_ATTEMPTS - newAttempts} 次机会`
    };
  }

  // 登录成功，重置失败次数，更新最后登录时间
  const token = generateToken();
  await client
    .from('users')
    .update({
      login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString()
    })
    .eq('id', user.id);

  await logLoginAttempt(user.id, ipAddress, userAgent, true);
  
  // 检查是否需要修改密码
  const mustChangePassword = user.must_change_password === true;

  const userResponse: User = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    mustChangePassword
  };

  // Cookie 设置已移到 API 层（login/route.ts），以便根据请求头动态设置
  // 这里只返回 token，由 API 层设置 Cookie

  return { 
    success: true, 
    user: userResponse, 
    token,
    mustChangePassword
  };
}

// 记录登录尝试
async function logLoginAttempt(
  userId: string | null,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  success: boolean,
  failReason?: string
) {
  try {
    const client = getSupabaseClient();
    
    await client
      .from('login_logs')
      .insert({
        user_id: userId,
        ip_address: ipAddress ? sanitizeInput(ipAddress, 50) : null,
        user_agent: userAgent ? sanitizeInput(userAgent, 500) : null,
        success,
        fail_reason: failReason ? sanitizeInput(failReason, 255) : null
      });
  } catch (error) {
    // 日志记录失败不应影响登录流程
    console.error('Failed to log login attempt:', error);
  }
}

// 获取当前用户（支持从 Cookie 或 Authorization header 获取认证信息）
export async function getCurrentUser(authHeader?: string): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    let userId = cookieStore.get('user_id')?.value;
    
    // 如果 Cookie 中没有 user_id，尝试从 auth_token Cookie 获取
    if (!userId) {
      const authToken = cookieStore.get('auth_token')?.value;
      if (authToken) {
        // 检查 auth_token 是否是有效的 UUID（可能是 user_id 被错误存储为 auth_token）
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authToken)) {
          userId = authToken;
          console.log(`[getCurrentUser] Using auth_token cookie as user_id: ${userId.substring(0, 8)}...`);
        }
      }
    }
    
    // 如果 Cookie 中没有，尝试从 Authorization header 获取
    if (!userId && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
        userId = token;
        console.log(`[getCurrentUser] Using Authorization header as user_id: ${userId.substring(0, 8)}...`);
      }
    }
    
    console.log(`[getCurrentUser] user_id: ${userId ? userId.substring(0, 8) + '...' : 'missing'}`);
    
    if (!userId) return null;
    
    // 验证userId格式（防止注入）
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      console.log(`[getCurrentUser] Invalid user_id format`);
      return null;
    }
    
    const client = getSupabaseClient();
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !user) return null;
    
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      mustChangePassword: user.must_change_password
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// 从请求中获取 Authorization header 并返回用户
export async function getUserFromRequest(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization') || undefined;
  return getCurrentUser(authHeader);
}

// 退出登录
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  cookieStore.delete('user_id');
}

// 重置密码（管理员使用）
export async function resetPasswordByAdmin(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  // 校验密码强度
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }
  
  // 验证userId格式
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { success: false, message: '无效的用户ID' };
  }
  
  const client = getSupabaseClient();
  
  const hashedPassword = await hashPassword(newPassword);
  
  const { error } = await client
    .from('users')
    .update({
      password: hashedPassword,
      login_attempts: 0,
      locked_until: null,
      must_change_password: true, // 重置后需要用户修改密码
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  if (error) {
    return { success: false, message: '重置密码失败' };
  }
  
  return { success: true, message: '密码重置成功' };
}

// 修改密码（用户使用）
export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  // 校验密码强度
  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }
  
  // 验证userId格式
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { success: false, message: '无效的用户ID' };
  }
  
  // 新旧密码不能相同
  if (oldPassword === newPassword) {
    return { success: false, message: '新密码不能与原密码相同' };
  }
  
  const client = getSupabaseClient();
  
  // 获取用户当前密码
  const { data: user, error } = await client
    .from('users')
    .select('password')
    .eq('id', userId)
    .single();
  
  if (error || !user) {
    return { success: false, message: '用户不存在' };
  }
  
  // 验证旧密码
  const isValid = await verifyPassword(oldPassword, user.password);
  if (!isValid) {
    return { success: false, message: '原密码错误' };
  }
  
  // 更新密码
  const hashedPassword = await hashPassword(newPassword);
  console.log(`[ChangePassword] Updating password for user: ${userId}`);
  
  // 使用 MySQL 格式的日期
  const mysqlDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  const { error: updateError } = await client
    .from('users')
    .update({
      password: hashedPassword,
      must_change_password: false,
      updated_at: mysqlDate
    })
    .eq('id', userId);
  
  if (updateError) {
    console.error('[ChangePassword] Update error:', updateError);
    return { success: false, message: `修改密码失败: ${updateError.message}` };
  }
  
  console.log('[ChangePassword] Password updated successfully');
  return { success: true, message: '密码修改成功' };
}

// 权限检查
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'user': 1
  };
  
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy];
}

// 检查是否为管理员
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

// 检查是否为管理员或经理
export function isManagerOrAdmin(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'manager';
}

// 验证分页参数
export function validatePagination(page: number, limit: number): { page: number; limit: number } {
  const MAX_LIMIT = 100;
  return {
    page: Math.max(1, Math.min(page, 10000)),
    limit: Math.max(1, Math.min(limit, MAX_LIMIT))
  };
}

// 验证价格
export function validatePrice(price: any): { valid: boolean; value: number; message: string } {
  if (price === undefined || price === null) {
    return { valid: false, value: 0, message: '价格不能为空' };
  }
  
  const num = parseFloat(price);
  if (isNaN(num)) {
    return { valid: false, value: 0, message: '价格格式不正确' };
  }
  
  if (num < 0) {
    return { valid: false, value: 0, message: '价格不能为负数' };
  }
  
  if (num > 999999999.99) {
    return { valid: false, value: 0, message: '价格超出范围' };
  }
  
  return { valid: true, value: num, message: '' };
}

// 验证数量
export function validateQuantity(quantity: any): { valid: boolean; value: number; message: string } {
  if (quantity === undefined || quantity === null) {
    return { valid: false, value: 0, message: '数量不能为空' };
  }
  
  const num = parseInt(quantity);
  if (isNaN(num)) {
    return { valid: false, value: 0, message: '数量格式不正确' };
  }
  
  if (num < 0) {
    return { valid: false, value: 0, message: '数量不能为负数' };
  }
  
  if (num > 2147483647) {
    return { valid: false, value: 0, message: '数量超出范围' };
  }
  
  return { valid: true, value: num, message: '' };
}
