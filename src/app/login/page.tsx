'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

// 登录表单内容组件
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingInstall, setCheckingInstall] = useState(true);
  const [needCaptcha, setNeedCaptcha] = useState(false); // 是否需要验证码
  const [failedAttempts, setFailedAttempts] = useState(0); // 失败次数

  useEffect(() => {
    // 检查系统是否已安装
    checkInstalled();
  }, []);

  const checkInstalled = async () => {
    try {
      const response = await fetch('/api/init/status');
      const data = await response.json();
      if (!data.installed) {
        router.push('/install');
        return;
      }
    } catch {
      // 忽略错误，继续显示登录页面
    } finally {
      setCheckingInstall(false);
    }
  };

  useEffect(() => {
    // 检查是否需要修改密码
    if (checkingInstall) return;
    
    const mustChange = searchParams.get('mustChangePassword');
    if (mustChange === 'true') {
      router.push('/change-password');
      return;
    }
  }, [checkingInstall]);

  useEffect(() => {
    // 只有需要验证码时才获取
    if (needCaptcha) {
      refreshCaptcha();
    }
  }, [needCaptcha]);

  const refreshCaptcha = async () => {
    try {
      const response = await fetch('/api/captcha', {
        credentials: 'include'
      });
      const svg = await response.text();
      setCaptchaSvg(svg);
      setCaptcha('');
    } catch (error) {
      console.error('Failed to fetch captcha:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 如果需要验证码但未输入
    if (needCaptcha && !captcha) {
      setError('请输入验证码');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, captcha: needCaptcha ? captcha : undefined }),
      });

      const data = await response.json();

      if (data.success) {
        // 登录成功，存储用户信息和 token 到 sessionStorage
        if (data.user) {
          sessionStorage.setItem('user', JSON.stringify(data.user));
        }
        if (data.token) {
          sessionStorage.setItem('auth_token', data.token);
        }
        
        if (data.mustChangePassword) {
          window.location.href = '/change-password?first=true';
        } else {
          // 延迟跳转，确保 cookie 已设置
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        }
      } else {
        // 登录失败
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        // 如果失败3次或更多，需要验证码
        if (newFailedAttempts >= 3) {
          setNeedCaptcha(true);
        }
        
        setError(data.message || '登录失败');
        if (needCaptcha) {
          refreshCaptcha();
        }
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      if (needCaptcha) {
        refreshCaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  // 检查安装状态时显示加载
  if (checkingInstall) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">零镜进销存</CardTitle>
          <CardDescription className="text-center">
            请输入您的账号和密码登录系统
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* 只有失败3次后才显示验证码 */}
            {needCaptcha && (
              <div className="space-y-2">
                <Label htmlFor="captcha">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="captcha"
                    type="text"
                    placeholder="请输入验证码"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value.toUpperCase())}
                    required
                    disabled={loading}
                    maxLength={4}
                    className="flex-1 uppercase"
                  />
                  <div 
                    className="border rounded cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                    onClick={refreshCaptcha}
                    title="点击刷新验证码"
                    dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  />
                </div>
                <p className="text-xs text-red-500">密码错误多次，请输入验证码</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center text-sm text-gray-500">
            <p>首次使用请访问 <a href="/install" className="text-blue-600 hover:underline">安装页面</a></p>
            <p className="mt-2">忘记密码请联系管理员重置</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 加载中占位组件
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">零镜进销存</CardTitle>
          <CardDescription className="text-center">加载中...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    </div>
  );
}

// 主页面组件
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
