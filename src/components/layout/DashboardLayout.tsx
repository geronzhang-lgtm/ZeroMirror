'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  TrendingDown, 
  TrendingUp, 
  Warehouse, 
  Users, 
  UserCircle,
  Settings, 
  LogOut,
  Menu,
  X,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeSelector } from '@/components/ui/theme-selector';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useI18n } from '@/components/providers/I18nProvider';

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ElementType;
  roles?: ('admin' | 'manager' | 'user')[];
}

const navItems: NavItem[] = [
  { nameKey: 'nav.home', href: '/', icon: Home },
  { nameKey: 'nav.products', href: '/products', icon: Package, roles: ['admin', 'manager'] },
  { nameKey: 'nav.purchase', href: '/purchase', icon: TrendingDown, roles: ['admin', 'manager'] },
  { nameKey: 'nav.sales', href: '/sales', icon: TrendingUp },
  { nameKey: 'nav.customers', href: '/customers', icon: UserCircle },
  { nameKey: 'nav.inventory', href: '/inventory', icon: Warehouse },
  { nameKey: 'nav.reports', href: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { nameKey: 'nav.users', href: '/users', icon: Users, roles: ['admin'] },
  { nameKey: 'nav.warehouses', href: '/warehouses', icon: Settings, roles: ['admin', 'manager'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  // 安全获取用户名首字母
  const userInitial = user?.name?.[0] || user?.username?.[0] || '?';

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端顶部导航 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm h-14">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label="打开菜单"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h1 className="text-lg font-bold text-gray-900">{t('home.title')}</h1>
          <div className="flex items-center gap-1">
            <ThemeSelector />
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r shadow-lg transform transition-transform duration-300
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:block
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden lg:flex items-center justify-center h-16 border-b">
            <h1 className="text-xl font-bold text-blue-600">{t('home.title')}</h1>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                             (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {t(item.nameKey)}
                </Link>
              );
            })}
          </nav>

          {/* 主题和语言设置 */}
          <div className="hidden lg:flex items-center justify-center gap-2 px-4 py-2 border-t">
            <ThemeSelector />
            <LanguageSelector />
          </div>

          {/* 用户信息 */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                      {userInitial}
                    </div>
                    <div className="ml-3 text-left">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">
                        {user.role === 'admin' ? t('users.title').replace('管理', '') : user.role === 'manager' ? '经理' : '用户'}
                      </p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('user.profile')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('user.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('user.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
