/**
 * 带认证的 fetch 工具函数
 * 自动从 sessionStorage 获取 token 并添加到 Authorization header
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, headers = {}, ...restOptions } = options;
  
  // 获取存储的 token
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      token = sessionStorage.getItem('auth_token');
    } catch {
      // ignore
    }
  }
  
  // 构建请求头
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  // 如果有 token 且未跳过认证，添加 Authorization header
  if (token && !skipAuth) {
    (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  // 发送请求，同时携带 credentials
  return fetch(url, {
    ...restOptions,
    headers: finalHeaders,
    credentials: 'include',
  });
}

/**
 * GET 请求
 */
export async function getWithAuth<T = unknown>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: 'GET' });
  return response.json();
}

/**
 * POST 请求
 */
export async function postWithAuth<T = unknown>(url: string, data?: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

/**
 * PUT 请求
 */
export async function putWithAuth<T = unknown>(url: string, data?: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

/**
 * DELETE 请求
 */
export async function deleteWithAuth<T = unknown>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: 'DELETE' });
  return response.json();
}
