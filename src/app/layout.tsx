import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';

export const metadata: Metadata = {
  title: '零镜进销存',
  description: '零镜进销存 - 专业的库存管理解决方案，支持多用户、多仓库管理',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
