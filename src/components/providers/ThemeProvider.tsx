'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// 预设主题色 (使用 oklch 格式以兼容 Tailwind CSS 4)
export const themes = [
  { id: 'blue', name: '海洋蓝', color: '#3b82f6', primary: 'oklch(0.627 0.251 254.6)' },
  { id: 'purple', name: '优雅紫', color: '#8b5cf6', primary: 'oklch(0.673 0.248 293.4)' },
  { id: 'green', name: '森林绿', color: '#22c55e', primary: 'oklch(0.696 0.17 142.5)' },
  { id: 'orange', name: '活力橙', color: '#f97316', primary: 'oklch(0.733 0.194 27.3)' },
  { id: 'red', name: '热情红', color: '#ef4444', primary: 'oklch(0.637 0.238 24.8)' },
  { id: 'pink', name: '浪漫粉', color: '#ec4899', primary: 'oklch(0.697 0.269 330.4)' },
  { id: 'teal', name: '青碧色', color: '#14b8a6', primary: 'oklch(0.704 0.147 168.4)' },
  { id: 'indigo', name: '靛蓝色', color: '#6366f1', primary: 'oklch(0.587 0.239 254.7)' },
] as const;

type ThemeId = typeof themes[number]['id'];
type Theme = typeof themes[number];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  useEffect(() => {
    // 从 localStorage 读取主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      const theme = themes.find(t => t.id === savedTheme);
      if (theme) {
        setCurrentTheme(theme);
      }
    }
  }, []);

  useEffect(() => {
    // 应用主题到 CSS 变量
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.primary);
    
    // 计算前景色（深色主题用浅色文字）- 使用 oklch 格式
    root.style.setProperty('--primary-foreground', 'oklch(0.985 0 0)');
    
    // 设置 sidebar 主色
    root.style.setProperty('--sidebar-primary', currentTheme.primary);
    root.style.setProperty('--sidebar-primary-foreground', 'oklch(0.985 0 0)');
    
    // 设置 ring 颜色用于 focus 状态
    root.style.setProperty('--ring', currentTheme.primary);
    
    // 保存到 localStorage
    localStorage.setItem('theme', currentTheme.id);
  }, [currentTheme]);

  const setTheme = (themeId: ThemeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
