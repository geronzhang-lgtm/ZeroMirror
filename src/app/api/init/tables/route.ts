import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { 
  query, 
  execute,
  saveDatabaseConfig, 
  initPool,
  closePool,
  DatabaseConfig 
} from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

// MySQL 建表 SQL
const CREATE_TABLES_SQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  login_attempts INT DEFAULT 0,
  locked_until DATETIME,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (role IN ('admin', 'manager', 'user'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 仓库表
CREATE TABLE IF NOT EXISTS warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  manager VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  parent_id INT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商品表
CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category_id INT,
  unit VARCHAR(20),
  purchase_price DECIMAL(12,2),
  sale_price DECIMAL(12,2),
  specification VARCHAR(200),
  barcode VARCHAR(50),
  min_stock INT DEFAULT 0,
  max_stock INT DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 库存表
CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  warehouse_id INT NOT NULL,
  quantity DECIMAL(12,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_product_warehouse (product_id, warehouse_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(50),
  phone VARCHAR(20),
  email VARCHAR(100),
  address VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(50),
  phone VARCHAR(20),
  wechat VARCHAR(50),
  email VARCHAR(100),
  address VARCHAR(500),
  credit_limit DECIMAL(12,2) DEFAULT 0,
  total_purchases DECIMAL(12,2) DEFAULT 0,
  purchase_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 进货单表
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INT,
  warehouse_id INT,
  total_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('pending', 'completed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 进货单明细表
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 销售单表
CREATE TABLE IF NOT EXISTS sales_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT,
  warehouse_id INT,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  customer_wechat VARCHAR(50),
  customer_address VARCHAR(255),
  total_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  remark TEXT,
  created_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('pending', 'completed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 销售单明细表
CREATE TABLE IF NOT EXISTS sales_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36),
  ip_address VARCHAR(50),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  fail_reason VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  \`key\` VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description VARCHAR(200),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 安装标记表
CREATE TABLE IF NOT EXISTS system_installed (
  id INT AUTO_INCREMENT PRIMARY KEY,
  installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  version VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
`;

// 检查数据库权限
async function checkSchemaPermissions(): Promise<{ hasPermission: boolean; message: string }> {
  try {
    // 尝试创建一个临时表来测试权限
    await query(`
      CREATE TABLE IF NOT EXISTS _permission_test (
        id INT AUTO_INCREMENT PRIMARY KEY
      )
    `);
    
    // 成功则删除测试表
    await execute('DROP TABLE IF EXISTS _permission_test');
    
    return { hasPermission: true, message: '' };
  } catch (error: any) {
    if (error.message.includes('permission denied') || error.message.includes('Access denied')) {
      return { 
        hasPermission: false, 
        message: '数据库用户没有创建表的权限' 
      };
    }
    // 其他错误，可能只是表已存在等问题，继续执行
    return { hasPermission: true, message: '' };
  }
}

// 初始化数据库表
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      host, 
      port, 
      database, 
      username, 
      password, 
      ssl,
      adminUsername, 
      adminPassword, 
      adminName 
    } = body;

    // 验证数据库连接参数
    if (!host || !database || !username || !password) {
      return NextResponse.json(
        { success: false, message: '请提供完整的数据库连接信息' },
        { status: 400 }
      );
    }

    // 验证管理员账号
    if (!adminUsername || !adminPassword || !adminName) {
      return NextResponse.json(
        { success: false, message: '请提供管理员账号信息' },
        { status: 400 }
      );
    }

    // 验证用户名格式
    if (adminUsername.length < 3 || adminUsername.length > 50) {
      return NextResponse.json(
        { success: false, message: '用户名长度必须在3-50个字符之间' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(adminUsername)) {
      return NextResponse.json(
        { success: false, message: '用户名只能包含字母、数字和下划线' },
        { status: 400 }
      );
    }

    // 验证密码强度
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: '密码长度至少8个字符' },
        { status: 400 }
      );
    }

    const hasUpper = /[A-Z]/.test(adminPassword);
    const hasLower = /[a-z]/.test(adminPassword);
    const hasNumber = /[0-9]/.test(adminPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(adminPassword);

    if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
      return NextResponse.json(
        { success: false, message: '密码必须包含大小写字母、数字和特殊字符' },
        { status: 400 }
      );
    }

    // 创建数据库配置
    const config: DatabaseConfig = {
      host,
      port: parseInt(port) || 3306,
      database,
      username,
      password,
      ssl: ssl === true
    };

    // 关闭旧连接池（如果有）
    await closePool();

    // 初始化新连接池
    initPool(config);

    try {
      // 检查数据库权限
      const permCheck = await checkSchemaPermissions();
      if (!permCheck.hasPermission) {
        await closePool();
        return NextResponse.json({
          success: false,
          message: permCheck.message,
          solution: getPermissionSolution(body)
        }, { status: 403 });
      }

      // 检查是否已安装
      const tableCheck = await query<RowDataPacket[]>(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'system_installed'
      `, [database]);

      if (tableCheck.length > 0) {
        const installedData = await query<RowDataPacket[]>('SELECT id FROM system_installed LIMIT 1');
        if (installedData.length > 0) {
          return NextResponse.json(
            { success: false, message: '系统已安装，请勿重复安装' },
            { status: 400 }
          );
        }
      }

      // 执行创建表的 SQL（分批执行）
      const statements = CREATE_TABLES_SQL.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await execute(statement.trim());
          } catch (err: any) {
            // 忽略 "索引已存在" 或 "表已存在" 错误
            if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
              console.error('SQL Error:', err.message, statement.substring(0, 100));
            }
          }
        }
      }

      // 添加销售单客户信息字段（兼容已存在的表）
      const alterTableStatements = [
        'ALTER TABLE sales_orders ADD COLUMN customer_name VARCHAR(100)',
        'ALTER TABLE sales_orders ADD COLUMN customer_phone VARCHAR(20)',
        'ALTER TABLE sales_orders ADD COLUMN customer_wechat VARCHAR(50)',
        'ALTER TABLE sales_orders ADD COLUMN customer_address VARCHAR(255)'
      ];
      for (const statement of alterTableStatements) {
        try {
          await execute(statement);
        } catch (err: any) {
          // 忽略 "列已存在" 或 "重复列名" 错误
          if (!err.message.includes('Duplicate column') && !err.message.includes('already exists')) {
            console.error('Alter table error:', err.message);
          }
        }
      }

      // 检查管理员用户是否已存在
      const existingAdmin = await query<RowDataPacket[]>(
        'SELECT id FROM users WHERE username = ?',
        [adminUsername]
      );

      if (existingAdmin.length > 0) {
        return NextResponse.json(
          { success: false, message: '用户名已存在，请更换' },
          { status: 400 }
        );
      }

      // 创建管理员用户
      const hashedPassword = await hashPassword(adminPassword);
      const userId = uuidv4();
      
      await execute(`
        INSERT INTO users (id, username, password, name, role, is_active, must_change_password, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'admin', true, false, ?, NOW(), NOW())
      `, [userId, adminUsername, hashedPassword, adminName, `${adminUsername}@example.com`]);

      // 标记已安装
      await execute(`
        INSERT INTO system_installed (installed_at, version)
        VALUES (NOW(), '1.0.0')
      `);

      // 保存数据库配置到文件
      await saveDatabaseConfig(config);

      return NextResponse.json({
        success: true,
        message: '系统安装成功',
        user: {
          id: userId,
          username: adminUsername,
          name: adminName,
          role: 'admin'
        }
      });
    } catch (dbError: any) {
      console.error('Database operation error:', dbError);
      
      // 如果数据库操作失败，关闭连接池
      await closePool();
      
      // 检查是否是权限错误
      if (dbError.message.includes('permission denied') || dbError.message.includes('Access denied')) {
        return NextResponse.json({
          success: false, 
          message: `数据库权限不足: ${dbError.message}`,
          solution: getPermissionSolution(body)
        }, { status: 403 });
      }
      
      return NextResponse.json(
        { success: false, message: `数据库操作失败: ${dbError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Init tables error:', error);
    return NextResponse.json(
      { success: false, message: `安装失败: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}

// 获取权限问题的解决方案
function getPermissionSolution(config: any): string {
  const { host, database, username } = config;
  
  // 检查是否是云数据库
  if (host && (host.includes('rds') || host.includes('mysql') || host.includes('database'))) {
    return `云数据库权限问题解决方法：

方法1：使用管理员账号授权
登录云数据库控制台，使用 root 或管理员账号执行：

GRANT ALL PRIVILEGES ON ${database || 'your_database'}.* TO '${username || 'your_user'}'@'%';
FLUSH PRIVILEGES;

方法2：检查数据库用户权限
确保您的数据库用户有以下权限：
- CREATE
- ALTER
- INSERT
- SELECT
- UPDATE
- DELETE
- INDEX`;
  }
  
  // 本地 MySQL
  return `MySQL 权限问题解决方法：

方法1：使用 root 账号授权
以 root 身份执行：

mysql -u root -p

然后执行：
GRANT ALL PRIVILEGES ON ${database || 'your_database'}.* TO '${username || 'your_user'}'@'localhost';
FLUSH PRIVILEGES;

方法2：创建新用户并授权
CREATE USER '${username || 'your_user'}'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON ${database || 'your_database'}.* TO '${username || 'your_user'}'@'localhost';
FLUSH PRIVILEGES;`;
}
