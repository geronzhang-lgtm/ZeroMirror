'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// 支持的语言
export const languages = [
  { id: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { id: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'ja', name: '日本語', flag: '🇯🇵' },
] as const;

type LanguageId = typeof languages[number]['id'];

// 翻译文本
const translations: Record<string, Record<string, string>> = {
  'zh-CN': {
    // 导航菜单
    'nav.home': '首页',
    'nav.products': '商品管理',
    'nav.purchase': '进货管理',
    'nav.sales': '销售管理',
    'nav.customers': '客户管理',
    'nav.inventory': '库存管理',
    'nav.reports': '报表统计',
    'nav.users': '用户管理',
    'nav.warehouses': '仓库管理',
    
    // 通用
    'common.search': '搜索',
    'common.add': '新建',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.submit': '提交',
    'common.back': '返回',
    'common.loading': '加载中...',
    'common.noData': '暂无数据',
    'common.actions': '操作',
    'common.status': '状态',
    'common.createdAt': '创建时间',
    'common.updatedAt': '更新时间',
    'common.success': '操作成功',
    'common.error': '操作失败',
    'common.required': '必填',
    'common.optional': '选填',
    
    // 首页
    'home.title': '零镜进销存',
    'home.subtitle': '专业的库存管理解决方案',
    'home.welcome': '欢迎回来',
    'home.overview': '这是您的业务概览',
    'home.todaySales': '今日销售',
    'home.todaySalesAmount': '今日销售额',
    'home.todaySalesDesc': '今日所有销售订单的总金额',
    'home.todayPurchase': '今日进货',
    'home.activeProducts': '在售商品',
    'home.activeWarehouses': '运营仓库',
    'home.lowStock': '库存预警',
    'home.lowStockDesc': '低于最小库存的商品',
    'home.restockNeeded': '需要补货的商品',
    
    // 商品
    'products.title': '商品管理',
    'products.subtitle': '管理商品信息和库存',
    'products.add': '新建商品',
    'products.sku': '商品编码',
    'products.name': '商品名称',
    'products.category': '分类',
    'products.unit': '单位',
    'products.purchasePrice': '进价',
    'products.salePrice': '售价',
    'products.specification': '规格',
    'products.barcode': '条码',
    'products.minStock': '最小库存',
    'products.maxStock': '最大库存',
    'products.description': '描述',
    'products.active': '在售',
    
    // 销售
    'sales.title': '销售管理',
    'sales.subtitle': '管理销售订单和客户信息',
    'sales.new': '新建销售单',
    'sales.orderNo': '销售单号',
    'sales.customer': '客户',
    'sales.customerPhone': '联系方式',
    'sales.warehouse': '仓库',
    'sales.amount': '金额',
    'sales.total': '合计',
    'sales.items': '商品明细',
    'sales.addItem': '添加商品',
    'sales.selectProduct': '选择商品',
    'sales.selectWarehouse': '选择仓库',
    'sales.pending': '待处理',
    'sales.completed': '已完成',
    'sales.cancelled': '已取消',
    
    // 客户
    'customers.title': '客户管理',
    'customers.subtitle': '管理客户信息和购买记录',
    'customers.add': '新建客户',
    'customers.code': '客户编码',
    'customers.name': '姓名',
    'customers.phone': '手机号',
    'customers.wechat': '微信号',
    'customers.email': '邮箱',
    'customers.address': '地址',
    'customers.creditLimit': '信用额度',
    'customers.totalPurchases': '购买总额',
    'customers.purchaseCount': '购买次数',
    'customers.purchaseHistory': '购买记录',
    'customers.searchPlaceholder': '搜索姓名、手机号、微信号、地址...',
    
    // 库存
    'inventory.title': '库存管理',
    'inventory.subtitle': '查看和管理各仓库库存',
    
    // 报表
    'reports.title': '报表统计',
    'reports.subtitle': '销售和库存数据分析',
    
    // 用户
    'users.title': '用户管理',
    'users.subtitle': '管理系统用户和权限',
    
    // 仓库
    'warehouses.title': '仓库管理',
    'warehouses.subtitle': '管理仓库信息',
    
    // 用户相关
    'user.profile': '个人资料',
    'user.settings': '系统设置',
    'user.logout': '退出登录',
    'user.changePassword': '修改密码',
    
    // 主题
    'theme.title': '主题色',
    'theme.select': '选择主题色',
    
    // 语言
    'language.title': '语言',
    'language.select': '选择语言',
  },
  'zh-TW': {
    // 導航菜單
    'nav.home': '首頁',
    'nav.products': '商品管理',
    'nav.purchase': '進貨管理',
    'nav.sales': '銷售管理',
    'nav.customers': '客戶管理',
    'nav.inventory': '庫存管理',
    'nav.reports': '報表統計',
    'nav.users': '用戶管理',
    'nav.warehouses': '倉庫管理',
    
    // 通用
    'common.search': '搜索',
    'common.add': '新建',
    'common.edit': '編輯',
    'common.delete': '刪除',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '確認',
    'common.submit': '提交',
    'common.back': '返回',
    'common.loading': '加載中...',
    'common.noData': '暫無數據',
    'common.actions': '操作',
    'common.status': '狀態',
    'common.createdAt': '創建時間',
    'common.updatedAt': '更新時間',
    'common.success': '操作成功',
    'common.error': '操作失敗',
    'common.required': '必填',
    'common.optional': '選填',
    
    // 首頁
    'home.title': '進銷存管理系統',
    'home.subtitle': '專業的庫存管理解決方案',
    'home.welcome': '歡迎回來',
    'home.overview': '這是您的業務概覽',
    'home.todaySales': '今日銷售',
    'home.todaySalesAmount': '今日銷售額',
    'home.todaySalesDesc': '今日所有銷售訂單的總金額',
    'home.todayPurchase': '今日進貨',
    'home.activeProducts': '在售商品',
    'home.activeWarehouses': '運營倉庫',
    'home.lowStock': '庫存預警',
    'home.lowStockDesc': '低於最小庫存的商品',
    'home.restockNeeded': '需要補貨的商品',
    
    // 商品
    'products.title': '商品管理',
    'products.subtitle': '管理商品信息和庫存',
    'products.add': '新建商品',
    'products.sku': '商品編碼',
    'products.name': '商品名稱',
    'products.category': '分類',
    'products.unit': '單位',
    'products.purchasePrice': '進價',
    'products.salePrice': '售價',
    
    // 銷售
    'sales.title': '銷售管理',
    'sales.subtitle': '管理銷售訂單和客戶信息',
    'sales.new': '新建銷售單',
    'sales.orderNo': '銷售單號',
    'sales.customer': '客戶',
    'sales.customerPhone': '聯繫方式',
    'sales.warehouse': '倉庫',
    'sales.amount': '金額',
    'sales.total': '合計',
    'sales.items': '商品明細',
    'sales.addItem': '添加商品',
    
    // 客戶
    'customers.title': '客戶管理',
    'customers.subtitle': '管理客戶信息和購買記錄',
    'customers.add': '新建客戶',
    'customers.name': '姓名',
    'customers.phone': '手機號',
    'customers.wechat': '微信號',
    'customers.email': '郵箱',
    'customers.address': '地址',
    'customers.creditLimit': '信用額度',
    'customers.totalPurchases': '購買總額',
    'customers.purchaseCount': '購買次數',
    'customers.purchaseHistory': '購買記錄',
    'customers.searchPlaceholder': '搜索姓名、手機號、微信號、地址...',
    
    // 庫存
    'inventory.title': '庫存管理',
    'inventory.subtitle': '查看和管理各倉庫庫存',
    
    // 報表
    'reports.title': '報表統計',
    'reports.subtitle': '銷售和庫存數據分析',
    
    // 用戶
    'users.title': '用戶管理',
    'users.subtitle': '管理系統用戶和權限',
    
    // 倉庫
    'warehouses.title': '倉庫管理',
    'warehouses.subtitle': '管理倉庫信息',
    
    // 用戶相關
    'user.profile': '個人資料',
    'user.settings': '系統設置',
    'user.logout': '退出登錄',
    'user.changePassword': '修改密碼',
    
    // 主題
    'theme.title': '主題色',
    'theme.select': '選擇主題色',
    
    // 語言
    'language.title': '語言',
    'language.select': '選擇語言',
  },
  'en': {
    // Navigation
    'nav.home': 'Home',
    'nav.products': 'Products',
    'nav.purchase': 'Purchase',
    'nav.sales': 'Sales',
    'nav.customers': 'Customers',
    'nav.inventory': 'Inventory',
    'nav.reports': 'Reports',
    'nav.users': 'Users',
    'nav.warehouses': 'Warehouses',
    
    // Common
    'common.search': 'Search',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.createdAt': 'Created At',
    'common.updatedAt': 'Updated At',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.required': 'Required',
    'common.optional': 'Optional',
    
    // Home
    'home.title': 'Inventory Management System',
    'home.subtitle': 'Professional Inventory Management Solution',
    'home.welcome': 'Welcome back',
    'home.overview': 'Here is your business overview',
    'home.todaySales': 'Today\'s Sales',
    'home.todaySalesAmount': 'Today\'s Revenue',
    'home.todaySalesDesc': 'Total amount of all sales orders today',
    'home.todayPurchase': 'Today\'s Purchase',
    'home.activeProducts': 'Active Products',
    'home.activeWarehouses': 'Active Warehouses',
    'home.lowStock': 'Low Stock Alert',
    'home.lowStockDesc': 'Products below minimum stock',
    'home.restockNeeded': 'Products need restocking',
    
    // Products
    'products.title': 'Product Management',
    'products.subtitle': 'Manage product information and inventory',
    'products.add': 'Add Product',
    'products.sku': 'SKU',
    'products.name': 'Product Name',
    'products.category': 'Category',
    'products.unit': 'Unit',
    'products.purchasePrice': 'Purchase Price',
    'products.salePrice': 'Sale Price',
    
    // Sales
    'sales.title': 'Sales Management',
    'sales.subtitle': 'Manage sales orders and customer information',
    'sales.new': 'New Sales Order',
    'sales.orderNo': 'Order No.',
    'sales.customer': 'Customer',
    'sales.customerPhone': 'Contact',
    'sales.warehouse': 'Warehouse',
    'sales.amount': 'Amount',
    'sales.total': 'Total',
    'sales.items': 'Order Items',
    'sales.addItem': 'Add Item',
    
    // Customers
    'customers.title': 'Customer Management',
    'customers.subtitle': 'Manage customer information and purchase history',
    'customers.add': 'Add Customer',
    'customers.name': 'Name',
    'customers.phone': 'Phone',
    'customers.wechat': 'WeChat',
    'customers.email': 'Email',
    'customers.address': 'Address',
    'customers.creditLimit': 'Credit Limit',
    'customers.totalPurchases': 'Total Purchases',
    'customers.purchaseCount': 'Purchase Count',
    'customers.purchaseHistory': 'Purchase History',
    'customers.searchPlaceholder': 'Search by name, phone, WeChat, address...',
    
    // Inventory
    'inventory.title': 'Inventory Management',
    'inventory.subtitle': 'View and manage warehouse inventory',
    
    // Reports
    'reports.title': 'Reports & Statistics',
    'reports.subtitle': 'Sales and inventory data analysis',
    
    // Users
    'users.title': 'User Management',
    'users.subtitle': 'Manage system users and permissions',
    
    // Warehouses
    'warehouses.title': 'Warehouse Management',
    'warehouses.subtitle': 'Manage warehouse information',
    
    // User related
    'user.profile': 'Profile',
    'user.settings': 'Settings',
    'user.logout': 'Logout',
    'user.changePassword': 'Change Password',
    
    // Theme
    'theme.title': 'Theme Color',
    'theme.select': 'Select Theme Color',
    
    // Language
    'language.title': 'Language',
    'language.select': 'Select Language',
  },
  'ja': {
    // ナビゲーション
    'nav.home': 'ホーム',
    'nav.products': '商品管理',
    'nav.purchase': '仕入管理',
    'nav.sales': '販売管理',
    'nav.customers': '顧客管理',
    'nav.inventory': '在庫管理',
    'nav.reports': 'レポート',
    'nav.users': 'ユーザー管理',
    'nav.warehouses': '倉庫管理',
    
    // 共通
    'common.search': '検索',
    'common.add': '新規追加',
    'common.edit': '編集',
    'common.delete': '削除',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.confirm': '確認',
    'common.submit': '送信',
    'common.back': '戻る',
    'common.loading': '読み込み中...',
    'common.noData': 'データがありません',
    'common.actions': '操作',
    'common.status': 'ステータス',
    'common.createdAt': '作成日時',
    'common.updatedAt': '更新日時',
    'common.success': '成功',
    'common.error': 'エラー',
    'common.required': '必須',
    'common.optional': '任意',
    
    // ホーム
    'home.title': '在庫管理システム',
    'home.subtitle': 'プロフェッショナルな在庫管理ソリューション',
    'home.welcome': 'おかえりなさい',
    'home.overview': 'ビジネスの概要です',
    'home.todaySales': '本日の販売',
    'home.todaySalesAmount': '本日の売上',
    'home.todaySalesDesc': '本日の全販売注文の合計金額',
    'home.todayPurchase': '本日の仕入',
    'home.activeProducts': '販売中商品',
    'home.activeWarehouses': '稼働倉庫',
    'home.lowStock': '在庫警告',
    'home.lowStockDesc': '最小在庫を下回った商品',
    'home.restockNeeded': '補充が必要な商品',
    
    // 商品
    'products.title': '商品管理',
    'products.subtitle': '商品情報と在庫を管理',
    'products.add': '商品追加',
    'products.sku': '商品コード',
    'products.name': '商品名',
    'products.category': 'カテゴリ',
    'products.unit': '単位',
    'products.purchasePrice': '仕入価格',
    'products.salePrice': '販売価格',
    
    // 販売
    'sales.title': '販売管理',
    'sales.subtitle': '販売注文と顧客情報を管理',
    'sales.new': '新規販売注文',
    'sales.orderNo': '注文番号',
    'sales.customer': '顧客',
    'sales.customerPhone': '連絡先',
    'sales.warehouse': '倉庫',
    'sales.amount': '金額',
    'sales.total': '合計',
    'sales.items': '注文明細',
    'sales.addItem': '商品を追加',
    
    // 顧客
    'customers.title': '顧客管理',
    'customers.subtitle': '顧客情報と購入履歴を管理',
    'customers.add': '顧客追加',
    'customers.name': '氏名',
    'customers.phone': '電話番号',
    'customers.wechat': 'WeChat',
    'customers.email': 'メール',
    'customers.address': '住所',
    'customers.creditLimit': '与信限度',
    'customers.totalPurchases': '購入総額',
    'customers.purchaseCount': '購入回数',
    'customers.purchaseHistory': '購入履歴',
    'customers.searchPlaceholder': '氏名、電話番号、WeChat、住所で検索...',
    
    // 在庫
    'inventory.title': '在庫管理',
    'inventory.subtitle': '倉庫在庫の表示と管理',
    
    // レポート
    'reports.title': 'レポート統計',
    'reports.subtitle': '販売と在庫のデータ分析',
    
    // ユーザー
    'users.title': 'ユーザー管理',
    'users.subtitle': 'システムユーザーと権限を管理',
    
    // 倉庫
    'warehouses.title': '倉庫管理',
    'warehouses.subtitle': '倉庫情報を管理',
    
    // ユーザー関連
    'user.profile': 'プロフィール',
    'user.settings': '設定',
    'user.logout': 'ログアウト',
    'user.changePassword': 'パスワード変更',
    
    // テーマ
    'theme.title': 'テーマカラー',
    'theme.select': 'テーマカラーを選択',
    
    // 言語
    'language.title': '言語',
    'language.select': '言語を選択',
  }
};

interface I18nContextType {
  locale: LanguageId;
  setLocale: (locale: LanguageId) => void;
  t: (key: string) => string;
  currentLanguage: typeof languages[number];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LanguageId>('zh-CN');

  useEffect(() => {
    // 从 localStorage 读取语言设置
    const savedLocale = localStorage.getItem('locale');
    if (savedLocale && languages.some(l => l.id === savedLocale)) {
      setLocaleState(savedLocale as LanguageId);
    }
  }, []);

  const setLocale = (newLocale: LanguageId) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
  };

  const t = (key: string): string => {
    return translations[locale]?.[key] || key;
  };

  const currentLanguage = languages.find(l => l.id === locale) || languages[0];

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, currentLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within a I18nProvider');
  }
  return context;
}
