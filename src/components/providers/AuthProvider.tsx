'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      // 先检查是否已安装
      const statusRes = await fetch('/api/init/status');
      const statusData = await statusRes.json();
      
      if (!statusData.installed) {
        setUser(null);
        setLoading(false);
        // 使用 window.location 而不是 router.push 避免hydration问题
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/install' && 
            window.location.pathname !== '/install/guide' &&
            !window.location.pathname.startsWith('/api/')) {
          window.location.href = '/install';
        }
        return;
      }

      // 检查 sessionStorage 中是否有 token
      let authToken: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          authToken = sessionStorage.getItem('auth_token');
        } catch {
          // ignore
        }
      }

      // 尝试通过 cookie 或 token 获取用户信息
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // 如果有 token，添加到 Authorization header
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        // 认证成功
        setUser(data.user);
        
        // 存储用户信息到 sessionStorage 作为备份
        try {
          sessionStorage.setItem('user', JSON.stringify(data.user));
        } catch {
          // ignore
        }
        
        // 如果需要修改密码
        if (data.user.mustChangePassword && 
            typeof window !== 'undefined' &&
            window.location.pathname !== '/change-password' && 
            window.location.pathname !== '/login') {
          router.push('/change-password?first=true');
        }
      } else {
        // 认证失败，检查 sessionStorage
        if (typeof window !== 'undefined') {
          try {
            const stored = sessionStorage.getItem('user');
            if (stored) {
              setUser(JSON.parse(stored));
              return;
            }
          } catch {
            sessionStorage.removeItem('user');
          }
        }
        
        setUser(null);
        // 跳转到登录页
        if (typeof window !== 'undefined' &&
            window.location.pathname !== '/login' && 
            window.location.pathname !== '/install' && 
            window.location.pathname !== '/change-password' && 
            !window.location.pathname.startsWith('/api/')) {
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('[Auth] Error:', error);
      // 出错时检查 sessionStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem('user');
          if (stored) {
            setUser(JSON.parse(stored));
            return;
          }
        } catch {
          // ignore
        }
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 只初始化一次
    if (initialized.current) return;
    initialized.current = true;
    
    // 先检查 sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('user');
        if (stored) {
          const userData = JSON.parse(stored);
          setUser(userData);
          setLoading(false);
          // 异步验证
          fetchUser();
          return;
        }
      } catch {
        sessionStorage.removeItem('user');
      }
    }
    
    // 没有 sessionStorage，验证 cookie
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user');
    }
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
