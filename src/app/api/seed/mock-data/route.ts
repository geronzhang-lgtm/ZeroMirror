import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/storage/database/supabase-client';
import { RowDataPacket } from 'mysql2/promise';

// 随机生成中文名
function generateChineseName(): string {
  const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧', '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕'];
  const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '华', '建国', '建华', '志强', '志明', '小红', '小明', '小芳', '小燕', '小军', '小伟', '文', '文华', '文杰', '文明', '建平', '建军', '建国', '国强', '国华', '海燕', '海涛', '海波', '海军', '婷婷', '丽丽', '美玲', '美华', '晓明', '晓芳', '晓燕', '晓红', '晓军', '晓伟', '志伟', '志刚', '志华', '志国'];
  
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  return surname + name;
}

// 随机生成手机号
function generatePhone(): string {
  const prefixes = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188', '189', '136', '137', '135', '133', '153', '180', '181'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += Math.floor(Math.random() * 10).toString();
  }
  return prefix + suffix;
}

// 随机生成微信号
function generateWechat(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let wechat = 'wx_';
  const length = Math.floor(Math.random() * 8) + 6; // 6-13位
  for (let i = 0; i < length; i++) {
    wechat += chars[Math.floor(Math.random() * chars.length)];
  }
  return wechat;
}

// 随机生成地址
function generateAddress(): string {
  const provinces = ['北京市', '上海市', '广东省', '江苏省', '浙江省', '山东省', '河南省', '四川省', '湖北省', '湖南省', '福建省', '安徽省', '河北省', '陕西省', '辽宁省'];
  const cities = ['朝阳区', '海淀区', '浦东新区', '天河区', '南山区', '江干区', '鼓楼区', '武侯区', '江汉区', '芙蓉区'];
  const streets = ['人民路', '中山路', '建设路', '解放路', '和平路', '胜利路', '文化路', '科技路', '商业街', '创业路'];
  
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  const building = Math.floor(Math.random() * 20) + 1;
  const room = Math.floor(Math.random() * 999) + 101;
  
  return `${province}${city}${street}${number}号${building}栋${room}室`;
}

// 随机选择数组元素
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 随机整数
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机浮点数
function randomFloat(min: number, max: number, decimals: number = 2): number {
  const num = Math.random() * (max - min) + min;
  return parseFloat(num.toFixed(decimals));
}

/**
 * 生成模拟数据
 * GET /api/seed/mock-data?customers=500&orders=1000
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerCount = parseInt(searchParams.get('customers') || '500');
    const orderCount = parseInt(searchParams.get('orders') || '1000');

    // 1. 获取现有产品和仓库
    const products = await query<RowDataPacket[]>('SELECT id, sku, name, sale_price FROM products WHERE is_active = true');
    const warehouses = await query<RowDataPacket[]>('SELECT id, name FROM warehouses WHERE is_active = true');

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: '请先创建商品数据'
      }, { status: 400 });
    }

    if (warehouses.length === 0) {
      return NextResponse.json({
        success: false,
        message: '请先创建仓库数据'
      }, { status: 400 });
    }

    console.log(`Found ${products.length} products, ${warehouses.length} warehouses`);

    // 2. 创建客户
    const createdCustomers: number[] = [];
    const batchSize = 50;
    
    for (let i = 0; i < customerCount; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, customerCount);
      const values: string[] = [];
      
      for (let j = i; j < batchEnd; j++) {
        const code = `C${Date.now()}${j.toString().padStart(4, '0')}`;
        const name = generateChineseName();
        const phone = generatePhone();
        const wechat = Math.random() > 0.3 ? generateWechat() : null;
        const address = Math.random() > 0.2 ? generateAddress() : null;
        const creditLimit = Math.random() > 0.7 ? randomInt(10000, 100000) : 0;
        
        values.push(`('${code}', '${name}', '${phone}', ${wechat ? `'${wechat}'` : 'NULL'}, ${address ? `'${address}'` : 'NULL'}, ${creditLimit})`);
      }
      
      const insertSql = `INSERT INTO customers (code, name, phone, wechat, address, credit_limit) VALUES ${values.join(',')}`;
      await execute(insertSql);
      
      // 获取刚插入的客户ID
      const newCustomers = await query<RowDataPacket[]>('SELECT id FROM customers ORDER BY id DESC LIMIT ?', [batchEnd - i]);
      createdCustomers.push(...newCustomers.map(c => c.id));
      
      console.log(`Created customers ${i + 1} to ${batchEnd}`);
    }

    // 获取所有客户
    const allCustomers = await query<RowDataPacket[]>('SELECT id, phone FROM customers');
    console.log(`Total customers: ${allCustomers.length}`);

    // 3. 创建销售订单
    const ordersPerBatch = 20;
    let totalOrdersCreated = 0;
    let totalItemsCreated = 0;

    for (let i = 0; i < orderCount; i += ordersPerBatch) {
      const batchEnd = Math.min(i + ordersPerBatch, orderCount);
      
      for (let j = i; j < batchEnd; j++) {
        // 随机选择客户
        const customer = randomChoice(allCustomers);
        // 随机选择仓库
        const warehouse = randomChoice(warehouses);
        // 随机商品数量 (1-5个商品)
        const itemCount = randomInt(1, 5);
        // 随机选择商品
        const selectedProducts = [];
        for (let k = 0; k < itemCount; k++) {
          selectedProducts.push(randomChoice(products));
        }

        // 创建订单
        const orderNo = `SO${Date.now()}${j.toString().padStart(5, '0')}`;
        const orderSql = `INSERT INTO sales_orders (order_no, customer_id, warehouse_id, customer_name, customer_phone, total_amount, status) VALUES (?, ?, ?, (SELECT name FROM customers WHERE id = ?), ?, 0, 'completed')`;
        const orderResult = await execute(orderSql, [orderNo, customer.id, warehouse.id, customer.id, customer.phone]);
        
        // 获取订单ID
        const orderIdResult = await query<RowDataPacket[]>('SELECT LAST_INSERT_ID() as id');
        const orderId = orderIdResult[0].id;
        totalOrdersCreated++;

        // 创建订单明细
        let orderTotal = 0;
        for (const product of selectedProducts) {
          const quantity = randomInt(1, 10);
          const basePrice = parseFloat(product.sale_price) || 100;
          // 价格随机浮动 ±20%
          const price = randomFloat(basePrice * 0.8, basePrice * 1.2);
          const amount = parseFloat((quantity * price).toFixed(2));
          orderTotal += amount;

          const itemSql = `INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)`;
          await execute(itemSql, [orderId, product.id, quantity, price, amount]);
          totalItemsCreated++;
        }

        // 更新订单总金额
        await execute('UPDATE sales_orders SET total_amount = ? WHERE id = ?', [orderTotal.toFixed(2), orderId]);
      }
      
      console.log(`Created orders ${i + 1} to ${batchEnd}`);
    }

    // 4. 更新客户统计信息
    console.log('Updating customer statistics...');
    await execute(`
      UPDATE customers c
      SET 
        total_purchases = (
          SELECT COALESCE(SUM(so.total_amount), 0)
          FROM sales_orders so
          WHERE so.customer_id = c.id AND so.status = 'completed'
        ),
        purchase_count = (
          SELECT COUNT(*)
          FROM sales_orders so
          WHERE so.customer_id = c.id AND so.status = 'completed'
        )
    `);

    return NextResponse.json({
      success: true,
      message: '模拟数据生成成功',
      summary: {
        customersCreated: customerCount,
        ordersCreated: totalOrdersCreated,
        orderItemsCreated: totalItemsCreated,
        productsAvailable: products.length,
        warehousesAvailable: warehouses.length
      }
    });

  } catch (error: any) {
    console.error('Seed data error:', error);
    return NextResponse.json({
      success: false,
      message: `生成失败: ${error.message}`
    }, { status: 500 });
  }
}
