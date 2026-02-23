import crypto from 'crypto';

// 验证码存储管理模块
// 使用 Node.js 全局变量确保跨请求共享

interface CaptchaData {
  code: string;
  expiresAt: number;
}

// 使用 global 确保在 Next.js 多 worker 环境下共享（单进程模式下有效）
// 注意：在多实例部署时需要使用 Redis 等外部存储
declare global {
  // eslint-disable-next-line no-var
  var __captchaStore: Map<string, CaptchaData> | undefined;
  // eslint-disable-next-line no-var
  var __captchaCleanupInterval: NodeJS.Timeout | undefined;
}

// 获取或创建全局存储
function getStore(): Map<string, CaptchaData> {
  if (!global.__captchaStore) {
    global.__captchaStore = new Map<string, CaptchaData>();
    console.log('[Captcha] Initialized global store');
  }
  return global.__captchaStore;
}

// 启动定期清理任务（只启动一次）
function startCleanupTask() {
  if (!global.__captchaCleanupInterval) {
    global.__captchaCleanupInterval = setInterval(() => {
      const store = getStore();
      const now = Date.now();
      let cleaned = 0;
      for (const [key, value] of store.entries()) {
        if (value.expiresAt < now) {
          store.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        console.log(`[Captcha] Cleaned ${cleaned} expired entries`);
      }
    }, 60000); // 每分钟清理一次
    
    // 防止进程退出
    if (global.__captchaCleanupInterval.unref) {
      global.__captchaCleanupInterval.unref();
    }
    
    console.log('[Captcha] Started cleanup task');
  }
}

// 初始化
startCleanupTask();

// 生成 session ID
export function generateSessionId(): string {
  return crypto.randomUUID();
}

// 存储验证码
export function storeCaptcha(sessionId: string, code: string): void {
  const store = getStore();
  store.set(sessionId, {
    code: code.toUpperCase(), // 统一存储大写
    expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟有效期
  });
  console.log(`[Captcha] Stored captcha for session ${sessionId.substring(0, 8)}..., store size: ${store.size}`);
}

// 验证码验证函数
export function verifyCaptcha(sessionId: string, userInput: string): boolean {
  if (!sessionId || !userInput) {
    console.log('[Captcha] Missing sessionId or userInput');
    return false;
  }
  
  const store = getStore();
  const stored = store.get(sessionId);
  
  if (!stored) {
    console.log(`[Captcha] No captcha found for session ${sessionId.substring(0, 8)}..., store size: ${store.size}`);
    // 打印当前存储的所有 session（调试用）
    if (store.size > 0) {
      const keys = Array.from(store.keys()).map(k => k.substring(0, 8));
      console.log(`[Captcha] Current sessions: ${keys.join(', ')}`);
    }
    return false;
  }
  
  // 检查是否过期
  if (stored.expiresAt < Date.now()) {
    store.delete(sessionId);
    console.log(`[Captcha] Captcha expired for session ${sessionId.substring(0, 8)}...`);
    return false;
  }
  
  // 验证后立即删除（一次性使用）
  store.delete(sessionId);
  
  // 大小写不敏感比较
  const isValid = stored.code === userInput.toUpperCase();
  console.log(`[Captcha] Verification result: ${isValid} (expected: ${stored.code}, got: ${userInput.toUpperCase()})`);
  
  return isValid;
}

// 清理指定sessionId的验证码
export function clearCaptcha(sessionId: string): void {
  const store = getStore();
  store.delete(sessionId);
}

// 获取存储统计（调试用）
export function getStoreStats(): { size: number; sessions: string[] } {
  const store = getStore();
  return {
    size: store.size,
    sessions: Array.from(store.keys()).map(k => k.substring(0, 8) + '...')
  };
}
