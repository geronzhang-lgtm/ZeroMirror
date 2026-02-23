import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';

// 检查系统是否已安装（兼容旧接口）
export async function GET() {
  try {
    // 首先检查数据库是否已配置
    const configured = await isDatabaseConfigured();
    if (!configured) {
      return NextResponse.json({ success: true, installed: false });
    }

    // 检查是否存在管理员用户
    const result = await query<RowDataPacket[]>(`
      SELECT id FROM users 
      WHERE role = 'admin' 
      LIMIT 1
    `);

    const installed = result.length > 0;
    return NextResponse.json({ success: true, installed });
  } catch (error: any) {
    console.error('Check installed error:', error);
    return NextResponse.json({ 
      success: false, 
      installed: false,
      error: error.message 
    });
  }
}
