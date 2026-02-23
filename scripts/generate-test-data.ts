/**
 * 测试数据生成脚本
 * 创建：3个仓库、10个品类、商品、2000个库存记录
 */

import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

// 数据库配置
const dbConfig = {
  host: '62.234.41.160',
  port: 3306,
  database: 'kc',
  user: 'kc',
  password: 'K5zpeSTwJ2wPycEd',
};

// 仓库名称
const warehouseNames = [
  { name: '北京主仓', code: 'BJ-001', location: '北京市朝阳区建国路88号', manager: '张三' },
  { name: '上海分仓', code: 'SH-001', location: '上海市浦东新区张江路100号', manager: '李四' },
  { name: '广州南仓', code: 'GZ-001', location: '广州市天河区天河路200号', manager: '王五' },
];

// 品类名称
const categoryNames = [
  '电子产品', '办公用品', '日用百货', '食品饮料', '服装鞋帽',
  '家居用品', '运动户外', '图书文具', '五金工具', '美容护理'
];

// 商品名称模板（每个品类20个商品）
const productTemplates: Record<string, string[]> = {
  '电子产品': ['手机', '平板电脑', '笔记本电脑', '智能手表', '耳机', '充电器', '数据线', '移动电源', '键盘', '鼠标', '显示器', '摄像头', '音箱', '路由器', 'U盘', '内存卡', '硬盘', '打印机', '扫描仪', '投影仪'],
  '办公用品': ['订书机', '打孔器', '文件夹', '档案盒', '计算器', '剪刀', '胶水', '胶带', '便签纸', '笔记本', '签字笔', '铅笔', '橡皮', '尺子', '订书钉', '回形针', '图钉', '白板', '白板笔', '擦除器'],
  '日用百货': ['洗衣液', '洗洁精', '牙膏', '牙刷', '毛巾', '浴巾', '纸巾', '垃圾袋', '保鲜膜', '保鲜盒', '拖把', '扫把', '垃圾桶', '衣架', '收纳箱', '挂钩', '抹布', '海绵', '手套', '围裙'],
  '食品饮料': ['矿泉水', '果汁', '可乐', '饼干', '薯片', '方便面', '巧克力', '糖果', '坚果', '茶叶', '咖啡', '牛奶', '酸奶', '面包', '蛋糕', '火腿肠', '罐头', '果冻', '蜜饯', '口香糖'],
  '服装鞋帽': ['T恤', '衬衫', '牛仔裤', '休闲裤', '外套', '羽绒服', '运动鞋', '皮鞋', '凉鞋', '拖鞋', '帽子', '围巾', '手套', '袜子', '内衣', '睡衣', '西装', '毛衣', '风衣', '马甲'],
  '家居用品': ['枕头', '被子', '床单', '枕套', '窗帘', '地毯', '沙发垫', '靠枕', '台灯', '闹钟', '相框', '花瓶', '装饰品', '收纳架', '衣帽架', '鞋柜', '书架', '置物架', '挂钩架', '灯具'],
  '运动户外': ['篮球', '足球', '排球', '羽毛球', '乒乓球', '跳绳', '瑜伽垫', '哑铃', '拉力器', '跑步机', '帐篷', '睡袋', '登山包', '水壶', '护膝', '护腕', '运动服', '泳镜', '泳帽', '滑板'],
  '图书文具': ['小说', '教材', '字典', '笔记本', '钢笔', '墨水', '颜料', '画笔', '调色板', '画架', '橡皮泥', '彩纸', '剪刀', '胶棒', '尺子套装', '圆规', '量角器', '文具盒', '书包', '笔袋'],
  '五金工具': ['螺丝刀', '扳手', '钳子', '锤子', '电钻', '锯子', '卷尺', '水平仪', '螺丝', '钉子', '螺母', '垫片', '胶枪', '电工胶带', '绝缘手套', '安全帽', '梯子', '工具箱', '切割刀', '砂纸'],
  '美容护理': ['洗面奶', '爽肤水', '乳液', '面霜', '防晒霜', '面膜', '眼霜', '精华液', '粉底', '口红', '眉笔', '睫毛膏', '眼影', '腮红', '化妆刷', '化妆棉', '卸妆水', '香水', '指甲油', '护手霜']
};

// 单位
const units = ['个', '件', '盒', '箱', '瓶', '袋', '支', '本', '套', '双', '条', '包', '罐', '桶', '块', '片', '张', '卷', '米', '克'];

async function generateTestData() {
  const connection = await mysql.createConnection(dbConfig);
  
  console.log('🔗 数据库连接成功');
  
  try {
    // 1. 创建仓库
    console.log('\n📦 创建仓库...');
    
    for (const wh of warehouseNames) {
      await connection.execute(
        `INSERT INTO warehouses (name, code, location, manager, is_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name), location = VALUES(location), manager = VALUES(manager)`,
        [wh.name, wh.code, wh.location, wh.manager, true]
      );
      console.log(`  ✅ 仓库: ${wh.name} (${wh.code})`);
    }
    
    // 获取仓库ID
    const [warehouses] = await connection.execute('SELECT id, name FROM warehouses WHERE is_active = true ORDER BY id');
    const warehouseIdList = (warehouses as { id: number; name: string }[]).map(w => w.id);
    console.log(`  📊 共 ${warehouseIdList.length} 个仓库`);
    
    // 2. 创建品类
    console.log('\n📂 创建品类...');
    
    for (let i = 0; i < categoryNames.length; i++) {
      const name = categoryNames[i];
      await connection.execute(
        `INSERT INTO categories (name, description, created_at) 
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [name, `${name}相关商品`]
      );
      console.log(`  ✅ 品类: ${name}`);
    }
    
    // 获取品类ID映射
    const [categories] = await connection.execute('SELECT id, name FROM categories');
    const categoryMap = new Map<string, number>();
    (categories as { id: number; name: string }[]).forEach(c => {
      categoryMap.set(c.name, c.id);
    });
    console.log(`  📊 共 ${categoryMap.size} 个品类`);
    
    // 3. 创建商品（每个品类20个）
    console.log('\n🏷️ 创建商品...');
    let productCount = 0;
    
    for (const [categoryName, products] of Object.entries(productTemplates)) {
      const categoryId = categoryMap.get(categoryName);
      if (!categoryId) {
        console.log(`  ⚠️ 品类 ${categoryName} 不存在，跳过`);
        continue;
      }
      
      for (let i = 0; i < products.length; i++) {
        const productName = products[i];
        const sku = `${categoryName.substring(0, 2)}${String(i + 1).padStart(3, '0')}`;
        const unit = units[Math.floor(Math.random() * units.length)];
        const purchasePrice = (Math.random() * 100 + 10).toFixed(2);
        const salePrice = (parseFloat(purchasePrice) * (1 + Math.random() * 0.5 + 0.1)).toFixed(2);
        const productId = randomUUID();
        
        try {
          await connection.execute(
            `INSERT INTO products (id, sku, name, category_id, unit, purchase_price, sale_price, min_stock, max_stock, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE name = VALUES(name)`,
            [productId, sku, productName, categoryId, unit, purchasePrice, salePrice, 10, 1000, true]
          );
          productCount++;
        } catch {
          // 忽略重复SKU
        }
      }
      console.log(`  ✅ ${categoryName}: ${products.length} 个商品`);
    }
    
    // 获取所有商品ID
    const [products] = await connection.execute('SELECT id FROM products WHERE is_active = true');
    const productIdList = (products as { id: string }[]).map(p => p.id);
    console.log(`  📊 共 ${productIdList.length} 个商品`);
    
    // 4. 创建库存记录（2000条）
    console.log('\n📊 创建库存记录 (2000条)...');
    let inventoryCount = 0;
    const batchSize = 50;
    const totalRecords = 2000;
    
    const values: (string | number)[][] = [];
    
    for (let i = 0; i < totalRecords; i++) {
      const productId = productIdList[Math.floor(Math.random() * productIdList.length)];
      const warehouseId = warehouseIdList[Math.floor(Math.random() * warehouseIdList.length)];
      const quantity = Math.floor(Math.random() * 500) + 10;
      
      values.push([productId, warehouseId, quantity]);
      
      if (values.length >= batchSize) {
        const placeholders = values.map(() => '(?, ?, ?, NOW(), NOW())').join(', ');
        const flatValues = values.flat();
        
        try {
          await connection.execute(
            `INSERT INTO inventory (product_id, warehouse_id, quantity, created_at, updated_at) 
             VALUES ${placeholders}
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
            flatValues
          );
          inventoryCount += values.length;
        } catch (err) {
          console.log(`  ⚠️ 批量插入部分失败，尝试逐条插入...`);
          // 逐条插入
          for (const v of values) {
            try {
              await connection.execute(
                `INSERT INTO inventory (product_id, warehouse_id, quantity, created_at, updated_at) 
                 VALUES (?, ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
                v
              );
              inventoryCount++;
            } catch {
              // 忽略单条错误
            }
          }
        }
        
        console.log(`  📝 已插入 ${inventoryCount}/${totalRecords} 条...`);
        values.length = 0;
      }
    }
    
    // 插入剩余记录
    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, NOW(), NOW())').join(', ');
      const flatValues = values.flat();
      
      try {
        await connection.execute(
          `INSERT INTO inventory (product_id, warehouse_id, quantity, created_at, updated_at) 
           VALUES ${placeholders}
           ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
          flatValues
        );
        inventoryCount += values.length;
      } catch {
        // 逐条插入
        for (const v of values) {
          try {
            await connection.execute(
              `INSERT INTO inventory (product_id, warehouse_id, quantity, created_at, updated_at) 
               VALUES (?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
              v
            );
            inventoryCount++;
          } catch {
            // 忽略
          }
        }
      }
    }
    
    console.log(`  ✅ 库存记录创建完成: ${inventoryCount} 条`);
    
    // 统计最终数据
    console.log('\n📈 数据统计:');
    
    const [whCount] = await connection.execute('SELECT COUNT(*) as count FROM warehouses WHERE is_active = true');
    console.log(`  🏭 仓库数量: ${(whCount as { count: number }[])[0].count}`);
    
    const [catCount] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    console.log(`  📂 品类数量: ${(catCount as { count: number }[])[0].count}`);
    
    const [prodCount] = await connection.execute('SELECT COUNT(*) as count FROM products WHERE is_active = true');
    console.log(`  🏷️ 商品数量: ${(prodCount as { count: number }[])[0].count}`);
    
    const [invCount] = await connection.execute('SELECT COUNT(*) as count FROM inventory');
    console.log(`  📊 库存记录: ${(invCount as { count: number }[])[0].count}`);
    
    const [totalQty] = await connection.execute('SELECT SUM(quantity) as total FROM inventory');
    console.log(`  📦 库存总量: ${(totalQty as { total: number }[])[0].total}`);
    
    console.log('\n✨ 测试数据生成完成！');
    
  } catch (error) {
    console.error('❌ 生成测试数据失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行
generateTestData().catch(console.error);
