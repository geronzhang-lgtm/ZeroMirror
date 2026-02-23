import { NextRequest, NextResponse } from 'next/server';
import { query, execute, loadDatabaseConfig } from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

// 随机商品名称词库
const PRODUCT_PREFIXES = [
  '优质', '进口', '国产', '特级', '精选', '有机', '天然', '高端', '经济', '实惠',
  '精品', '豪华', '经典', '新款', '畅销', '推荐', '热卖', '爆款', '限量', '定制'
];

const PRODUCT_NAMES = [
  '苹果', '香蕉', '橙子', '葡萄', '西瓜', '草莓', '蓝莓', '芒果', '菠萝', '樱桃',
  '牛奶', '酸奶', '奶酪', '黄油', '奶油', '奶粉', '豆奶', '椰奶', '羊奶', '马奶',
  '大米', '面粉', '面条', '面包', '馒头', '饺子', '汤圆', '粽子', '月饼', '年糕',
  '猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉', '鹅肉', '鱼肉', '虾', '蟹', '贝类',
  '白菜', '菠菜', '芹菜', '韭菜', '生菜', '青菜', '萝卜', '胡萝卜', '土豆', '洋葱',
  '可乐', '雪碧', '果汁', '茶饮', '咖啡', '奶茶', '矿泉水', '苏打水', '运动饮料', '功能饮料',
  '薯片', '饼干', '糖果', '巧克力', '坚果', '蜜饯', '果冻', '蛋糕', '冰淇淋', '爆米花',
  '牙膏', '洗发水', '沐浴露', '洗面奶', '面霜', '防晒霜', '口红', '香水', '护手霜', '面膜',
  '纸巾', '湿巾', '洗衣液', '洗洁精', '消毒液', '空气清新剂', '蚊香', '杀虫剂', '垃圾袋', '保鲜膜',
  '电池', '灯泡', '插座', '数据线', '充电器', '耳机', '鼠标', '键盘', 'U盘', '移动硬盘'
];

const PRODUCT_SUFFIXES = [
  '礼盒装', '家庭装', '经济装', '便携装', '散装', '精品装', '礼袋装', '罐装', '瓶装', '袋装',
  '500g', '1kg', '2kg', '5kg', '10kg', '250ml', '500ml', '1L', '2L', '100片'
];

const CATEGORIES = [
  '水果蔬菜', '乳制品', '粮油米面', '肉禽蛋品', '海鲜水产',
  '饮料冲调', '休闲零食', '个护清洁', '日用百货', '数码配件',
  '酒水茶饮', '母婴用品', '宠物用品', '家居家纺', '厨房用品',
  '文具办公', '运动户外', '服装鞋帽', '美妆护肤', '珠宝首饰',
  '钟表眼镜', '汽车用品', '家装建材', '五金工具', '医疗器械',
  '保健食品', '营养品', '进口食品', '地方特产', '有机食品',
  '速食熟食', '调味品', '冷冻食品', '儿童玩具', '图书音像',
  '乐器', '收藏品', '艺术品', '礼品工艺品', '电子烟',
  '成人用品', '智能设备', '智能家居', '安防设备', '办公设备',
  '通信设备', '摄影器材', '影音设备', '游戏设备', '其他'
];

const UNITS = ['个', '件', '盒', '袋', '瓶', '罐', '箱', '包', '斤', 'kg', 'ml', 'L', '双', '套', '条', '片', '张', '本', '支', '把'];

// 生成随机SKU
function generateSKU(index: number): string {
  const prefix = 'SKU';
  const paddedIndex = String(index).padStart(6, '0');
  return `${prefix}${paddedIndex}`;
}

// 生成随机商品名称
function generateProductName(): string {
  const prefix = PRODUCT_PREFIXES[Math.floor(Math.random() * PRODUCT_PREFIXES.length)];
  const name = PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)];
  const suffix = PRODUCT_SUFFIXES[Math.floor(Math.random() * PRODUCT_SUFFIXES.length)];
  return `${prefix}${name}${suffix}`;
}

// 生成随机价格（保留两位小数）
function generatePrice(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// 生成随机单位
function generateUnit(): string {
  return UNITS[Math.floor(Math.random() * UNITS.length)];
}

// 检查表是否存在
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query<RowDataPacket[]>(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]);
    return result.length > 0;
  } catch {
    return false;
  }
}

// 生成分类数据
export async function POST(request: NextRequest) {
  try {
    // 检查数据库是否已配置
    const dbConfig = await loadDatabaseConfig();
    if (!dbConfig) {
      return NextResponse.json({ 
        success: false, 
        message: '数据库未配置，请先完成系统安装' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { categoryCount = 50, productCount = 2000, clearExisting = false } = body;

    // 检查表是否存在
    const categoriesExist = await checkTableExists('categories');
    const productsExist = await checkTableExists('products');

    if (!categoriesExist || !productsExist) {
      return NextResponse.json({ 
        success: false, 
        message: '数据库表不存在，请先初始化数据库' 
      }, { status: 400 });
    }

    const results = {
      categoriesCreated: 0,
      productsCreated: 0,
      errors: [] as string[]
    };

    // 清除现有数据（可选）
    if (clearExisting) {
      try {
        await execute('SET FOREIGN_KEY_CHECKS = 0');
        await execute('TRUNCATE TABLE products');
        await execute('TRUNCATE TABLE categories');
        await execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`清除数据失败: ${errorMessage}`);
      }
    }

    // 生成分类
    const categoryIds: number[] = [];
    const categoriesToInsert = CATEGORIES.slice(0, Math.min(categoryCount, CATEGORIES.length));
    
    // 批量插入分类
    for (let i = 0; i < categoriesToInsert.length; i++) {
      const categoryName = categoriesToInsert[i];
      try {
        const result = await execute(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [categoryName, `${categoryName}相关商品`]
        );
        categoryIds.push(result.insertId);
        results.categoriesCreated++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // 忽略重复键错误，尝试获取已存在的ID
        try {
          const existing = await query<RowDataPacket[]>(
            'SELECT id FROM categories WHERE name = ?',
            [categoryName]
          );
          if (existing.length > 0) {
            categoryIds.push(existing[0].id);
          }
        } catch {
          results.errors.push(`分类 "${categoryName}" 插入失败: ${errorMessage}`);
        }
      }
    }

    // 生成商品（分批插入，每批100个）
    const batchSize = 100;
    const batches = Math.ceil(productCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, productCount);
      
      const values: string[] = [];
      const params: (string | number | null)[] = [];
      
      for (let i = startIdx; i < endIdx; i++) {
        const sku = generateSKU(i + 1);
        const name = generateProductName();
        const categoryId = categoryIds.length > 0 
          ? categoryIds[Math.floor(Math.random() * categoryIds.length)] 
          : null;
        const unit = generateUnit();
        const purchasePrice = generatePrice(1, 500);
        const salePrice = generatePrice(purchasePrice, purchasePrice * 1.5 + 100);
        const minStock = Math.floor(Math.random() * 50);
        const maxStock = minStock + Math.floor(Math.random() * 200) + 50;
        
        values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        params.push(sku, name, categoryId, unit, purchasePrice, salePrice, minStock, maxStock, name);
      }

      try {
        const sql = `
          INSERT INTO products (id, sku, name, category_id, unit, purchase_price, sale_price, min_stock, max_stock, description, is_active)
          VALUES ${values.map(() => '(UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, true)').join(', ')}
        `;
        
        // 重新构建参数
        const newParams: (string | number | null)[] = [];
        for (let i = startIdx; i < endIdx; i++) {
          const sku = generateSKU(i + 1);
          const name = generateProductName();
          const categoryId = categoryIds.length > 0 
            ? categoryIds[Math.floor(Math.random() * categoryIds.length)] 
            : null;
          const unit = generateUnit();
          const purchasePrice = generatePrice(1, 500);
          const salePrice = generatePrice(purchasePrice, purchasePrice * 1.5 + 100);
          const minStock = Math.floor(Math.random() * 50);
          const maxStock = minStock + Math.floor(Math.random() * 200) + 50;
          
          newParams.push(sku, name, categoryId, unit, purchasePrice, salePrice, minStock, maxStock, name);
        }

        await execute(sql, newParams);
        results.productsCreated += endIdx - startIdx;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`批次 ${batch + 1} 插入失败: ${errorMessage}`);
        
        // 尝试逐条插入
        for (let i = startIdx; i < endIdx; i++) {
          try {
            const id = uuidv4();
            const sku = generateSKU(i + 1);
            const name = generateProductName();
            const categoryId = categoryIds.length > 0 
              ? categoryIds[Math.floor(Math.random() * categoryIds.length)] 
              : null;
            const unit = generateUnit();
            const purchasePrice = generatePrice(1, 500);
            const salePrice = generatePrice(purchasePrice, purchasePrice * 1.5 + 100);
            const minStock = Math.floor(Math.random() * 50);
            const maxStock = minStock + Math.floor(Math.random() * 200) + 50;

            await execute(
              `INSERT INTO products (id, sku, name, category_id, unit, purchase_price, sale_price, min_stock, max_stock, description, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
              [id, sku, name, categoryId, unit, purchasePrice, salePrice, minStock, maxStock, name]
            );
            results.productsCreated++;
          } catch (singleError: unknown) {
            // 忽略单条错误，继续下一条
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功生成 ${results.categoriesCreated} 个分类，${results.productsCreated} 个商品`,
      ...results
    });

  } catch (error: unknown) {
    console.error('Seed data error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      message: '生成数据失败: ' + errorMessage 
    }, { status: 500 });
  }
}

// 获取生成状态
export async function GET() {
  try {
    // 检查表是否存在
    const categoriesExist = await checkTableExists('categories');
    const productsExist = await checkTableExists('products');

    if (!categoriesExist || !productsExist) {
      return NextResponse.json({
        success: true,
        initialized: false,
        message: '数据库表不存在，请先初始化数据库'
      });
    }

    // 获取现有数据统计
    const categoryCount = await query<RowDataPacket[]>('SELECT COUNT(*) as count FROM categories');
    const productCount = await query<RowDataPacket[]>('SELECT COUNT(*) as count FROM products');

    return NextResponse.json({
      success: true,
      initialized: true,
      categoryCount: categoryCount[0]?.count || 0,
      productCount: productCount[0]?.count || 0
    });
  } catch (error: unknown) {
    console.error('Get seed status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      message: '获取状态失败: ' + errorMessage 
    }, { status: 500 });
  }
}
