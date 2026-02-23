import { NextRequest, NextResponse } from 'next/server';
import { query, execute, getPool } from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';

// 数据库迁移 - 更新表结构以匹配新的字段名
export async function POST(request: NextRequest) {
  try {
    // 检查 products 表是否存在以及是否有旧字段
    const checkTableSql = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    `;
    
    const columns = await query<RowDataPacket[]>(checkTableSql);
    const columnNames = columns.map((c) => (c as { COLUMN_NAME: string }).COLUMN_NAME);
    
    const migrations: string[] = [];
    
    // 检查是否需要迁移 products 表
    if (columnNames.includes('code') && !columnNames.includes('sku')) {
      migrations.push(`
        ALTER TABLE products 
        CHANGE COLUMN code sku VARCHAR(50) UNIQUE NOT NULL
      `);
    }
    
    if (columnNames.includes('cost_price') && !columnNames.includes('purchase_price')) {
      migrations.push(`
        ALTER TABLE products 
        CHANGE COLUMN cost_price purchase_price DECIMAL(12,2)
      `);
    }
    
    if (!columnNames.includes('min_stock')) {
      migrations.push(`
        ALTER TABLE products 
        ADD COLUMN min_stock INT DEFAULT 0 AFTER barcode
      `);
    }
    
    if (!columnNames.includes('max_stock')) {
      migrations.push(`
        ALTER TABLE products 
        ADD COLUMN max_stock INT DEFAULT 0 AFTER min_stock
      `);
    }
    
    if (!columnNames.includes('description')) {
      migrations.push(`
        ALTER TABLE products 
        ADD COLUMN description TEXT AFTER max_stock
      `);
    }
    
    // 执行迁移
    const results: { migration: string; success: boolean; error?: string }[] = [];
    
    for (const migration of migrations) {
      try {
        await execute(migration);
        results.push({ migration: migration.trim().substring(0, 100), success: true });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ migration: migration.trim().substring(0, 100), success: false, error: errorMessage });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: migrations.length > 0 ? '数据库迁移完成' : '无需迁移',
      migrationsExecuted: migrations.length,
      results
    });
  } catch (error: unknown) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: '迁移失败: ' + errorMessage
    }, { status: 500 });
  }
}

// 获取迁移状态
export async function GET() {
  try {
    await getPool();
    
    // 检查 products 表结构
    const checkTableSql = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
      ORDER BY ORDINAL_POSITION
    `;
    
    const columns = await query<RowDataPacket[]>(checkTableSql);
    
    const columnNames = columns.map((c) => (c as { COLUMN_NAME: string }).COLUMN_NAME);
    const needsMigration = 
      columnNames.includes('code') || 
      columnNames.includes('cost_price') ||
      !columnNames.includes('sku') ||
      !columnNames.includes('purchase_price') ||
      !columnNames.includes('min_stock') ||
      !columnNames.includes('max_stock') ||
      !columnNames.includes('description');
    
    return NextResponse.json({
      success: true,
      needsMigration,
      currentColumns: columns,
      recommendedActions: needsMigration ? [
        columnNames.includes('code') ? '重命名 code -> sku' : null,
        columnNames.includes('cost_price') ? '重命名 cost_price -> purchase_price' : null,
        !columnNames.includes('min_stock') ? '添加 min_stock 列' : null,
        !columnNames.includes('max_stock') ? '添加 max_stock 列' : null,
        !columnNames.includes('description') ? '添加 description 列' : null
      ].filter(Boolean) : []
    });
  } catch (error: unknown) {
    console.error('Check migration status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: '检查失败: ' + errorMessage
    }, { status: 500 });
  }
}
