'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { postWithAuth } from '@/lib/fetch-with-auth';

// 主内容组件（使用 useSearchParams）
function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isFirstLogin = searchParams.get('first') === 'true';

  // 密码强度检查
  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noConsecutive: !/(.)\1{2,}/.test(password)
    };
    const passedCount = Object.values(checks).filter(Boolean).length;
    return { checks, score: passedCount };
  };

  const strengthCheck = checkPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 前端验证
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有必填项');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (strengthCheck.score < 5) {
      setError('密码强度不足，请确保包含大小写字母、数字和特殊字符');
      return;
    }

    setLoading(true);

    try {
      const data = await postWithAuth<{ success: boolean; message?: string }>('/api/auth/change-password', {
        oldPassword,
        newPassword,
      });

      if (data.success) {
        alert('密码修改成功！请使用新密码重新登录。');
        // 清除登录状态和 token
        sessionStorage.removeItem('auth_token');
        await fetch('/api/auth/logout', { 
          method: 'POST',
          credentials: 'include'
        });
        router.push('/login');
      } else {
        setError(data.message || '密码修改失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {isFirstLogin ? '首次登录 - 修改密码' : '修改密码'}
        </CardTitle>
        <CardDescription className="text-center">
          {isFirstLogin 
            ? '为了账户安全，首次登录必须修改密码' 
            : '请输入原密码和新密码'}
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
            <Label htmlFor="oldPassword">
              {isFirstLogin ? '当前密码（刚使用的登录密码）' : '原密码'}
            </Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showOldPassword ? 'text' : 'password'}
                placeholder={isFirstLogin ? '请输入刚才登录时使用的密码' : '请输入原密码'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowOldPassword(!showOldPassword)}
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isFirstLogin && (
              <p className="text-xs text-gray-500">
                请输入您刚才登录时使用的密码
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="请输入新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* 密码强度指示器 */}
            {newPassword && (
              <div className="space-y-2 text-sm">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        strengthCheck.score >= level
                          ? strengthCheck.score <= 2
                            ? 'bg-red-500'
                            : strengthCheck.score <= 3
                            ? 'bg-yellow-500'
                            : strengthCheck.score <= 4
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                  <span className={strengthCheck.checks.length ? 'text-green-600' : ''}>
                    {strengthCheck.checks.length ? '✓' : '○'} 至少8个字符
                  </span>
                  <span className={strengthCheck.checks.uppercase ? 'text-green-600' : ''}>
                    {strengthCheck.checks.uppercase ? '✓' : '○'} 大写字母
                  </span>
                  <span className={strengthCheck.checks.lowercase ? 'text-green-600' : ''}>
                    {strengthCheck.checks.lowercase ? '✓' : '○'} 小写字母
                  </span>
                  <span className={strengthCheck.checks.number ? 'text-green-600' : ''}>
                    {strengthCheck.checks.number ? '✓' : '○'} 数字
                  </span>
                  <span className={strengthCheck.checks.special ? 'text-green-600' : ''}>
                    {strengthCheck.checks.special ? '✓' : '○'} 特殊字符
                  </span>
                  <span className={strengthCheck.checks.noConsecutive ? 'text-green-600' : ''}>
                    {strengthCheck.checks.noConsecutive ? '✓' : '○'} 无连续重复
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword && (
              <p className={`text-sm ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                {newPassword === confirmPassword ? '✓ 密码一致' : '✗ 密码不一致'}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              '确认修改'
            )}
          </Button>

          {!isFirstLogin && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
              disabled={loading}
            >
              取消
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// 加载中占位组件
function ChangePasswordLoading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">修改密码</CardTitle>
        <CardDescription className="text-center">加载中...</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </CardContent>
    </Card>
  );
}

// 主页面组件（使用 Suspense 包裹）
export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Suspense fallback={<ChangePasswordLoading />}>
        <ChangePasswordContent />
      </Suspense>
    </div>
  );
}
