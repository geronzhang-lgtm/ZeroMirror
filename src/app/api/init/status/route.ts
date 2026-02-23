import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';

// 检查系统是否已安装
export async function GET() {
  try {
    // 首先检查数据库是否已配置
    const configured = await isDatabaseConfigured();
    if (!configured) {
      return NextResponse.json({ installed: false });
    }

    // 检查是否存在管理员用户
    const result = await query<RowDataPacket[]>(`
      SELECT id FROM users 
      WHERE role = 'admin' 
      LIMIT 1
    `);

    const installed = result.length > 0;
    return NextResponse.json({ installed });
  } catch (error: any) {
    console.error('Check status error:', error);
    // 如果出现任何错误（数据库未配置、连接失败等），返回未安装状态
    return NextResponse.json({ 
      installed: false,
      error: error.message 
    });
  }
}
