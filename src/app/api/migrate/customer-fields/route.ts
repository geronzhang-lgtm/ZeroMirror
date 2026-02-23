import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/storage/database/supabase-client';

/**
 * 数据库迁移：为客户表添加微信号字段
 * GET /api/migrate/customer-wechat
 */
export async function GET(request: NextRequest) {
  try {
    const alterTableStatements = [
      'ALTER TABLE customers ADD COLUMN wechat VARCHAR(50)',
      'ALTER TABLE customers ADD COLUMN total_purchases DECIMAL(12,2) DEFAULT 0',
      'ALTER TABLE customers ADD COLUMN purchase_count INT DEFAULT 0'
    ];
    
    const results: string[] = [];
    
    for (const statement of alterTableStatements) {
      try {
        await execute(statement);
        results.push(`✓ 执行成功: ${statement.split('ADD COLUMN')[1]?.trim().split(' ')[0]}`);
      } catch (err: any) {
        if (err.message.includes('Duplicate column') || err.message.includes('already exists')) {
          results.push(`○ 字段已存在: ${statement.split('ADD COLUMN')[1]?.trim().split(' ')[0]}`);
        } else {
          results.push(`✗ 执行失败: ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '数据库迁移完成',
      results
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      message: `迁移失败: ${error.message}`
    }, { status: 500 });
  }
}
