import { NextRequest, NextResponse } from 'next/server';
import { testConnection, query, isDatabaseConfigured, initPool, closePool } from '@/storage/database/supabase-client';
import { DatabaseConfig } from '@/storage/database/db-client';
import { RowDataPacket } from 'mysql2/promise';

// 测试数据库连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // MySQL 数据库连接：{ host, port, database, username, password, ssl }
    
    if (!body.host || !body.database || !body.username || !body.password) {
      return NextResponse.json(
        { success: false, message: '请提供完整的数据库连接信息（host, database, username, password）' },
        { status: 400 }
      );
    }

    const config: DatabaseConfig = {
      host: body.host,
      port: parseInt(body.port) || 3306, // MySQL 默认端口
      database: body.database,
      username: body.username,
      password: body.password,
      ssl: body.ssl === true
    };

    // 测试连接
    const result = await testConnection(config);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message,
        needInit: false
      });
    }

    // 检查是否需要初始化表
    let needInit = false;
    try {
      // 初始化临时连接池
      initPool(config);
      
      // MySQL 检查表是否存在
      const tableCheck = await query<RowDataPacket[]>(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      `, [config.database]);
      
      if (tableCheck.length === 0) {
        needInit = true;
      }
      
      // 关闭临时连接池
      await closePool();
    } catch (e: any) {
      needInit = true;
      try {
        await closePool();
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: needInit ? '数据库连接成功，需要初始化数据表' : '数据库连接成功',
      needInit: needInit,
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        ssl: config.ssl
      }
    });
  } catch (error: any) {
    console.error('Test DB error:', error);
    return NextResponse.json(
      { success: false, message: `连接失败: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}

// 检查数据库配置状态
export async function GET() {
  try {
    const configured = await isDatabaseConfigured();
    return NextResponse.json({
      configured,
      message: configured ? '数据库已配置' : '数据库未配置，请先完成系统安装'
    });
  } catch (error: any) {
    return NextResponse.json(
      { configured: false, message: error.message },
      { status: 500 }
    );
  }
}
