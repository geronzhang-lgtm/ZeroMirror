'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Key, 
  User, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Server
} from 'lucide-react';

export default function InstallGuidePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('database');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    {
      id: 'database',
      title: '1. 数据库准备',
      icon: Database,
      content: (
        <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>支持多种数据库</AlertTitle>
            <AlertDescription>
              本系统支持 MySQL 数据库，可以使用本地安装的 MySQL 或云数据库服务（如 AWS RDS、阿里云 RDS、腾讯云 MySQL 等）。
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <Server className="w-4 h-4 mr-2" />
              方式一：本地 MySQL
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>安装 MySQL 数据库（版本 5.7 或更高，推荐 8.0+）</li>
              <li>创建数据库：
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono mt-2">
                  <Button size="sm" variant="ghost" onClick={() => copyCode(`# 连接 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选）
CREATE USER 'inventory_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON inventory.* TO 'inventory_user'@'%';
FLUSH PRIVILEGES;`, 'localdb')} className="text-gray-400 hover:text-white float-right">
                    {copiedCode === 'localdb' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <pre className="whitespace-pre-wrap">{`# 连接 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户（可选）
CREATE USER 'inventory_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON inventory.* TO 'inventory_user'@'%';
FLUSH PRIVILEGES;`}</pre>
                </div>
              </li>
              <li>记录连接信息：主机、端口、数据库名、用户名、密码</li>
            </ol>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">方式二：云数据库服务</h4>
            <p className="text-sm text-gray-700 mb-2">
              支持主流云服务商的 MySQL 数据库：
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li><strong>阿里云 RDS MySQL</strong> - 在控制台获取连接地址和端口</li>
              <li><strong>腾讯云 MySQL</strong> - 在实例详情页获取外网地址</li>
              <li><strong>AWS RDS for MySQL</strong> - 在控制台获取终端节点</li>
              <li><strong>华为云 RDS MySQL</strong> - 获取连接地址和端口</li>
            </ul>
            <p className="text-sm text-gray-500 mt-2">
              云数据库通常需要启用 SSL 连接，并配置白名单允许访问。
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">方式三：Docker MySQL</h4>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
              <Button size="sm" variant="ghost" onClick={() => copyCode(`# 使用 Docker 启动 MySQL
docker run -d --name mysql-inventory \\
  -e MYSQL_ROOT_PASSWORD=your_password \\
  -e MYSQL_DATABASE=inventory \\
  -p 3306:3306 \\
  mysql:8.0 \\
  --character-set-server=utf8mb4 \\
  --collation-server=utf8mb4_unicode_ci`, 'docker-mysql')} className="text-gray-400 hover:text-white float-right">
                {copiedCode === 'docker-mysql' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="whitespace-pre-wrap">{`# 使用 Docker 启动 MySQL
docker run -d --name mysql-inventory \\
  -e MYSQL_ROOT_PASSWORD=your_password \\
  -e MYSQL_DATABASE=inventory \\
  -p 3306:3306 \\
  mysql:8.0 \\
  --character-set-server=utf8mb4 \\
  --collation-server=utf8mb4_unicode_ci`}</pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'deploy',
      title: '2. 部署方式',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">方式一：Docker 部署（推荐）</h4>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400"># 拉取并运行</span>
                <Button size="sm" variant="ghost" onClick={() => copyCode(`docker run -d --name inventory-system -p 5000:5000 your-registry/inventory-system:latest`, 'docker')} className="text-gray-400 hover:text-white">
                  {copiedCode === 'docker' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap">docker run -d \
  --name inventory-system \
  -p 5000:5000 \
  your-registry/inventory-system:latest</pre>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">方式二：源码部署</h4>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
              <Button size="sm" variant="ghost" onClick={() => copyCode(`git clone <repository-url>
cd inventory-system
pnpm install
pnpm build
pnpm start`, 'source')} className="text-gray-400 hover:text-white float-right">
                {copiedCode === 'source' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="whitespace-pre-wrap">{`git clone <repository-url>
cd inventory-system
pnpm install
pnpm build
pnpm start`}</pre>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">方式三：PM2 部署（生产环境）</h4>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
              <Button size="sm" variant="ghost" onClick={() => copyCode(`npm install -g pm2
pnpm build
pm2 start pnpm --name "inventory-system" -- start
pm2 startup
pm2 save`, 'pm2')} className="text-gray-400 hover:text-white float-right">
                {copiedCode === 'pm2' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="whitespace-pre-wrap">{`npm install -g pm2
pnpm build
pm2 start pnpm --name "inventory-system" -- start
pm2 startup
pm2 save`}</pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'install',
      title: '3. 安装向导',
      icon: User,
      content: (
        <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>自动跳转</AlertTitle>
            <AlertDescription>
              部署完成后首次访问系统，会自动跳转到安装向导页面。
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">步骤1：数据库配置</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li><strong>数据库主机</strong>：数据库服务器地址（如 localhost 或 rds-xxx.mysql.rds.aliyuncs.com）</li>
              <li><strong>端口</strong>：MySQL 端口，默认 3306</li>
              <li><strong>数据库名称</strong>：创建的数据库名称</li>
              <li><strong>用户名</strong>：数据库用户名</li>
              <li><strong>密码</strong>：数据库密码</li>
              <li><strong>SSL</strong>：云数据库通常需要启用</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">点击"测试连接"验证数据库配置</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">步骤2：管理员账号设置</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li><strong>用户名</strong>：3-50字符，仅字母、数字、下划线</li>
              <li><strong>姓名</strong>：管理员显示名称</li>
              <li><strong>密码</strong>：至少8位，需包含大小写字母、数字、特殊字符</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">密码要求</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />至少8个字符</span>
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />大写字母 A-Z</span>
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />小写字母 a-z</span>
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />数字 0-9</span>
              <span className="flex items-center"><CheckCircle className="w-4 h-4 text-green-600 mr-2" />特殊字符 !@#$%</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              示例强密码：<code className="bg-white px-2 py-1 rounded">Admin@123456</code>
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: '4. 常见问题',
      icon: AlertCircle,
      content: (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-red-600 mb-2">Q: 数据库连接失败？</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>检查 MySQL 服务是否已启动</li>
              <li>确认主机地址和端口是否正确</li>
              <li>确认用户名和密码是否正确</li>
              <li>检查防火墙是否允许 3306 端口连接</li>
              <li>云数据库检查是否启用 SSL 和配置白名单</li>
              <li>检查数据库用户是否有远程访问权限</li>
            </ul>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-red-600 mb-2">Q: 提示 "Access denied for user"？</h4>
            <p className="text-sm text-gray-700 mb-2">
              这是数据库用户权限不足，需要授权。
            </p>
            <p className="text-sm font-medium text-gray-800 mb-1">解决方法：</p>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto mb-2">
              <pre>{`-- 以 root 用户身份执行
GRANT ALL PRIVILEGES ON inventory.* TO 'your_user'@'%';
FLUSH PRIVILEGES;

-- 如果用户不存在，先创建
CREATE USER 'your_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON inventory.* TO 'your_user'@'%';
FLUSH PRIVILEGES;`}</pre>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-red-600 mb-2">Q: 忘记管理员密码？</h4>
            <p className="text-sm text-gray-700 mb-2">
              直接在数据库中重置：
            </p>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
              <pre>{`-- 连接数据库后执行
UPDATE users 
SET must_change_password = true 
WHERE role = 'admin';`}</pre>
            </div>
            <p className="text-sm text-gray-700 mt-2">
              下次登录时会要求设置新密码。
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-red-600 mb-2">Q: 如何重新安装？</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>删除数据库中的所有表：
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono mt-2">
                  <pre>{`-- 在 MySQL 中执行
DROP DATABASE inventory;
CREATE DATABASE inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`}</pre>
                </div>
              </li>
              <li>删除服务器上的 db.config.json 文件</li>
              <li>重启服务并访问 /install</li>
            </ol>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-red-600 mb-2">Q: 如何配置 HTTPS？</h4>
            <p className="text-sm text-gray-700 mb-2">
              使用 Nginx 反向代理配置 SSL 证书：
            </p>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
              <pre>{`server {
  listen 443 ssl;
  server_name your-domain.com;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
  }
}`}</pre>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">安装部署教程</h1>
          <p className="text-gray-600">零镜进销存 - 完整安装指南</p>
        </div>

        <div className="mb-6 flex gap-4 justify-center">
          <a href="/install">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              开始安装
            </Button>
          </a>
          <a href="/login">
            <Button variant="outline" size="lg">
              前往登录
            </Button>
          </a>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            
            return (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    {section.content}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>版本：1.0.0 | 技术支持：提交 Issue 获取帮助</p>
        </div>
      </div>
    </div>
  );
}
