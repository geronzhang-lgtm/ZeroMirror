'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Database, 
  User, 
  Check,
  Eye, 
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Shield,
  Server
} from 'lucide-react';

type Step = 'welcome' | 'database' | 'admin' | 'installing' | 'complete';

interface InstallResponse {
  success: boolean;
  message: string;
  solution?: string;
  user?: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
}

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

interface InstallState extends DatabaseConfig {
  adminUsername: string;
  adminPassword: string;
  adminName: string;
  confirmPassword: string;
}

export default function InstallPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [dbTestResult, setDbTestResult] = useState<{ 
    success: boolean; 
    message: string; 
    needInit?: boolean;
    config?: DatabaseConfig;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [installSolution, setInstallSolution] = useState<string>('');
  
  const [state, setState] = useState<InstallState>({
    host: 'localhost',
    port: '3306',
    database: '',
    username: '',
    password: '',
    ssl: false,
    adminUsername: '',
    adminPassword: '',
    adminName: '',
    confirmPassword: ''
  });

  // 检查是否已安装
  useEffect(() => {
    checkInstalled();
  }, []);

  const checkInstalled = async () => {
    try {
      const response = await fetch('/api/init/status');
      const data = await response.json();
      if (data.installed) {
        setStep('complete');
      }
    } catch {
      // 忽略错误
    }
  };

  // 测试数据库连接
  const testDatabase = async () => {
    if (!state.host || !state.database || !state.username || !state.password) {
      setError('请填写完整的数据库连接信息');
      return;
    }

    setTesting(true);
    setError('');
    setDbTestResult(null);

    try {
      const response = await fetch('/api/init/test-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: state.host,
          port: parseInt(state.port) || 3306,
          database: state.database,
          username: state.username,
          password: state.password,
          ssl: state.ssl
        })
      });
      const data = await response.json();
      setDbTestResult(data);
    } catch (err: any) {
      setDbTestResult({ success: false, message: err.message || '测试失败' });
    } finally {
      setTesting(false);
    }
  };

  // 密码强度检查
  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    const passedCount = Object.values(checks).filter(Boolean).length;
    return { checks, score: passedCount };
  };

  const strengthCheck = checkPasswordStrength(state.adminPassword);

  // 验证管理员信息
  const validateAdminInfo = () => {
    if (!state.adminUsername || state.adminUsername.length < 3) {
      setError('用户名至少3个字符');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(state.adminUsername)) {
      setError('用户名只能包含字母、数字和下划线');
      return false;
    }
    if (!state.adminName) {
      setError('请输入管理员姓名');
      return false;
    }
    if (strengthCheck.score < 5) {
      setError('密码强度不足，需包含大小写字母、数字和特殊字符');
      return false;
    }
    if (state.adminPassword !== state.confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }
    return true;
  };

  // 执行安装
  const handleInstall = async () => {
    if (!validateAdminInfo()) return;
    if (!dbTestResult?.success) {
      setError('请先测试数据库连接');
      return;
    }

    setStep('installing');
    setError('');
    setInstallSolution('');

    try {
      const response = await fetch('/api/init/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: state.host,
          port: parseInt(state.port) || 5432,
          database: state.database,
          username: state.username,
          password: state.password,
          ssl: state.ssl,
          adminUsername: state.adminUsername,
          adminPassword: state.adminPassword,
          adminName: state.adminName
        })
      });
      const data: InstallResponse = await response.json();

      if (data.success) {
        setStep('complete');
      } else {
        setError(data.message || '安装失败');
        if (data.solution) {
          setInstallSolution(data.solution);
        }
        setStep('admin');
      }
    } catch (err: any) {
      setError(err.message || '安装失败');
      setStep('admin');
    }
  };

  // 下一步
  const goNext = () => {
    setError('');
    setInstallSolution('');
    if (step === 'welcome') {
      setStep('database');
    } else if (step === 'database') {
      if (!dbTestResult?.success) {
        setError('请先测试数据库连接');
        return;
      }
      setStep('admin');
    } else if (step === 'admin') {
      handleInstall();
    }
  };

  // 上一步
  const goBack = () => {
    setError('');
    setInstallSolution('');
    if (step === 'database') setStep('welcome');
    else if (step === 'admin') setStep('database');
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'welcome', label: '欢迎' },
      { key: 'database', label: '数据库' },
      { key: 'admin', label: '管理员' },
      { key: 'complete', label: '完成' }
    ];
    
    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              i < currentIndex ? 'bg-green-500 text-white' :
              i === currentIndex ? 'bg-blue-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < currentIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i <= currentIndex ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${i < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // 欢迎页面
  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
        <Shield className="h-10 w-10 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">欢迎使用零镜进销存</h2>
        <p className="text-gray-600">让我们开始安装配置</p>
      </div>
      <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2">
        <p className="font-medium">安装过程需要以下信息：</p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>MySQL 数据库连接信息（支持本地或云数据库）</li>
          <li>管理员账号信息（用户名、密码、姓名）</li>
        </ul>
      </div>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>准备工作</AlertTitle>
        <AlertDescription>
          请确保您已有可访问的 MySQL 数据库（本地安装或云服务均可）。
          <a href="/install/guide" className="block mt-2 text-blue-600 hover:underline">
            📖 查看详细安装教程 →
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );

  // 数据库配置页面
  const renderDatabase = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Server className="h-12 w-12 mx-auto text-blue-600 mb-2" />
        <h2 className="text-xl font-bold">数据库配置</h2>
        <p className="text-gray-600 text-sm">请输入 MySQL 数据库连接信息</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="host">数据库主机</Label>
          <Input
            id="host"
            type="text"
            placeholder="localhost 或数据库服务器地址"
            value={state.host}
            onChange={(e) => { setState({ ...state, host: e.target.value }); setDbTestResult(null); }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="port">端口</Label>
          <Input
            id="port"
            type="text"
            placeholder="3306"
            value={state.port}
            onChange={(e) => { setState({ ...state, port: e.target.value }); setDbTestResult(null); }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="database">数据库名称</Label>
        <Input
          id="database"
          type="text"
          placeholder="请输入数据库名称"
          value={state.database}
          onChange={(e) => { setState({ ...state, database: e.target.value }); setDbTestResult(null); }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          type="text"
          placeholder="请输入数据库用户名"
          value={state.username}
          onChange={(e) => { setState({ ...state, username: e.target.value }); setDbTestResult(null); }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <div className="relative">
          <Input
            id="password"
            type={showDbPassword ? 'text' : 'password'}
            placeholder="请输入数据库密码"
            value={state.password}
            onChange={(e) => { setState({ ...state, password: e.target.value }); setDbTestResult(null); }}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowDbPassword(!showDbPassword)}
          >
            {showDbPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="ssl"
          checked={state.ssl}
          onCheckedChange={(checked) => setState({ ...state, ssl: checked === true })}
        />
        <Label htmlFor="ssl" className="text-sm text-gray-600">
          启用 SSL 连接（云数据库通常需要）
        </Label>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={testDatabase}
        disabled={testing || !state.host || !state.database || !state.username || !state.password}
      >
        {testing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            测试连接中...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            测试连接
          </>
        )}
      </Button>

      {dbTestResult && (
        <Alert variant={dbTestResult.success ? 'default' : 'destructive'}>
          {dbTestResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className={dbTestResult.success ? 'text-green-700' : ''}>
            {dbTestResult.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // 管理员配置页面
  const renderAdmin = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <User className="h-12 w-12 mx-auto text-blue-600 mb-2" />
        <h2 className="text-xl font-bold">管理员账号</h2>
        <p className="text-gray-600 text-sm">创建系统管理员账号</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="adminUsername">用户名</Label>
          <Input
            id="adminUsername"
            type="text"
            placeholder="admin"
            value={state.adminUsername}
            onChange={(e) => setState({ ...state, adminUsername: e.target.value })}
            maxLength={50}
          />
          <p className="text-xs text-gray-500">3-50个字符，仅限字母、数字、下划线</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminName">姓名</Label>
          <Input
            id="adminName"
            type="text"
            placeholder="系统管理员"
            value={state.adminName}
            onChange={(e) => setState({ ...state, adminName: e.target.value })}
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminPassword">密码</Label>
          <div className="relative">
            <Input
              id="adminPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              value={state.adminPassword}
              onChange={(e) => setState({ ...state, adminPassword: e.target.value })}
              maxLength={100}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          
          {state.adminPassword && (
            <div className="space-y-2 text-sm">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded ${
                      strengthCheck.score >= level
                        ? strengthCheck.score <= 2 ? 'bg-red-500'
                        : strengthCheck.score <= 3 ? 'bg-yellow-500'
                        : strengthCheck.score <= 4 ? 'bg-blue-500'
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
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="请再次输入密码"
              value={state.confirmPassword}
              onChange={(e) => setState({ ...state, confirmPassword: e.target.value })}
              maxLength={100}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {state.confirmPassword && state.adminPassword && (
            <p className={`text-sm ${state.adminPassword === state.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
              {state.adminPassword === state.confirmPassword ? '✓ 密码一致' : '✗ 密码不一致'}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // 安装中页面
  const renderInstalling = () => (
    <div className="text-center space-y-4 py-8">
      <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin" />
      <h2 className="text-xl font-bold">正在安装...</h2>
      <p className="text-gray-600">请稍候，系统正在初始化数据库表结构</p>
    </div>
  );

  // 完成页面
  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">安装完成！</h2>
        <p className="text-gray-600">系统已成功安装，您现在可以登录使用了</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 text-left">
        <p className="font-medium mb-2">您的管理员账号：</p>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-500">用户名：</span>{state.adminUsername || 'admin'}</p>
          <p><span className="text-gray-500">姓名：</span>{state.adminName || '系统管理员'}</p>
        </div>
      </div>

      <Button onClick={() => router.push('/login')} className="w-full" size="lg">
        前往登录
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          {step !== 'installing' && renderStepIndicator()}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{error}</div>
                {installSolution && (
                  <pre className="mt-3 p-3 bg-gray-100 rounded text-xs whitespace-pre-wrap text-gray-700 overflow-auto max-h-60">
                    {installSolution}
                  </pre>
                )}
              </AlertDescription>
            </Alert>
          )}

          {step === 'welcome' && renderWelcome()}
          {step === 'database' && renderDatabase()}
          {step === 'admin' && renderAdmin()}
          {step === 'installing' && renderInstalling()}
          {step === 'complete' && renderComplete()}

          {step !== 'installing' && step !== 'complete' && (
            <div className="flex gap-3 pt-4">
              {step !== 'welcome' && (
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  上一步
                </Button>
              )}
              <Button onClick={goNext} className={step === 'welcome' ? 'w-full' : 'flex-1'}>
                {step === 'admin' ? '开始安装' : '下一步'}
                {step !== 'admin' && <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
