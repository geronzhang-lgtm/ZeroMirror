# 零镜进销存 API 文档

## 基础信息

- **基础路径**: `/api`
- **认证方式**: Bearer Token (Header) 或 Cookie
- **数据格式**: JSON
- **字符编码**: UTF-8

## 目录

- [认证接口](#认证接口)
- [商品管理](#商品管理)
- [采购管理](#采购管理)
- [销售管理](#销售管理)
- [客户管理](#客户管理)
- [库存管理](#库存管理)
- [仓库管理](#仓库管理)
- [用户管理](#用户管理)
- [报表统计](#报表统计)
- [系统配置](#系统配置)

---

## 认证接口

### 登录

```
POST /api/auth/login
```

**请求体**:
```json
{
  "username": "admin",
  "password": "password123",
  "captchaId": "optional-captcha-id",
  "captchaCode": "optional-captcha-code"
}
```

**响应**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "管理员",
    "role": "admin"
  },
  "token": "bearer-token"
}
```

### 获取当前用户

```
GET /api/auth/me
```

**响应**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "管理员",
    "role": "admin",
    "email": "admin@example.com"
  }
}
```

### 退出登录

```
POST /api/auth/logout
```

### 修改密码

```
POST /api/auth/change-password
```

**请求体**:
```json
{
  "oldPassword": "old-password",
  "newPassword": "new-password"
}
```

---

## 商品管理

### 获取商品列表

```
GET /api/products
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 搜索关键词 |
| category | number | 分类ID |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应**:
```json
{
  "success": true,
  "products": [
    {
      "id": "uuid",
      "sku": "SKU001",
      "name": "商品名称",
      "unit": "个",
      "purchase_price": "100.00",
      "sale_price": "150.00",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 创建商品

```
POST /api/products
```

**请求体**:
```json
{
  "sku": "SKU001",
  "name": "商品名称",
  "unit": "个",
  "purchasePrice": 100.00,
  "salePrice": 150.00,
  "categoryId": 1,
  "specification": "规格说明",
  "minStock": 10,
  "maxStock": 100
}
```

### 更新商品

```
PUT /api/products
```

### 删除商品

```
DELETE /api/products?id={id}
```

---

## 采购管理

### 获取采购单列表

```
GET /api/purchase
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 搜索关键词 |
| status | string | 状态筛选 |
| page | number | 页码 |

### 创建采购单

```
POST /api/purchase
```

**请求体**:
```json
{
  "supplierId": 1,
  "warehouseId": 1,
  "items": [
    {
      "productId": "uuid",
      "quantity": 10,
      "price": 100.00
    }
  ]
}
```

---

## 销售管理

### 获取销售单列表

```
GET /api/sales
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 搜索订单号 |
| status | string | 状态筛选 |

**响应**:
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "order_no": "SO1234567890",
      "customer_name": "客户姓名",
      "customer_phone": "13800138000",
      "total_amount": 1500.00,
      "status": "completed",
      "warehouse_name": "主仓库",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### 创建销售单

```
POST /api/sales
```

**请求体**:
```json
{
  "warehouseId": 1,
  "customerInfo": {
    "name": "客户姓名",
    "phone": "13800138000",
    "wechat": "wechat_id",
    "address": "客户地址"
  },
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "price": 150.00,
      "amount": 300.00
    }
  ],
  "totalAmount": 300.00
}
```

---

## 客户管理

### 获取客户列表

```
GET /api/customers
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 搜索姓名/手机号/微信号/地址 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应**:
```json
{
  "success": true,
  "customers": [
    {
      "id": 1,
      "code": "C1234567890",
      "name": "客户姓名",
      "phone": "13800138000",
      "wechat": "wx_xxx",
      "address": "客户地址",
      "total_purchases": "5000.00",
      "purchase_count": 10,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 创建客户

```
POST /api/customers
```

**请求体**:
```json
{
  "name": "客户姓名",
  "phone": "13800138000",
  "wechat": "wx_xxx",
  "email": "customer@example.com",
  "address": "客户地址",
  "creditLimit": 10000
}
```

### 获取客户详情

```
GET /api/customers/{id}
```

**响应**:
```json
{
  "success": true,
  "customer": {
    "id": 1,
    "code": "C1234567890",
    "name": "客户姓名",
    "phone": "13800138000",
    "wechat": "wx_xxx",
    "address": "客户地址",
    "total_purchases": 5000.00,
    "purchase_count": 10
  },
  "orders": [
    {
      "id": 1,
      "order_no": "SO1234567890",
      "total_amount": 500.00,
      "status": "completed",
      "warehouse_name": "主仓库",
      "items": [
        {
          "product_name": "商品名称",
          "product_sku": "SKU001",
          "quantity": 2,
          "unit_price": 250.00,
          "amount": 500.00
        }
      ]
    }
  ]
}
```

### 更新客户

```
PUT /api/customers
```

### 删除客户

```
DELETE /api/customers?id={id}
```

---

## 库存管理

### 获取库存列表

```
GET /api/inventory
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| warehouseId | number | 仓库ID |
| search | string | 搜索商品 |
| lowStock | boolean | 仅显示低库存 |

---

## 仓库管理

### 获取仓库列表

```
GET /api/warehouses
```

### 创建仓库

```
POST /api/warehouses
```

**请求体**:
```json
{
  "name": "仓库名称",
  "code": "WH001",
  "location": "仓库地址",
  "manager": "负责人"
}
```

### 更新仓库

```
PUT /api/api/warehouses/{id}
```

### 删除仓库

```
DELETE /api/warehouses/{id}
```

---

## 用户管理

### 获取用户列表

```
GET /api/users
```

### 创建用户

```
POST /api/users
```

**请求体**:
```json
{
  "username": "user1",
  "password": "password123",
  "name": "用户姓名",
  "role": "user",
  "email": "user@example.com"
}
```

### 重置用户密码

```
POST /api/users/{id}/reset-password
```

---

## 报表统计

### 获取统计数据

```
GET /api/reports/stats
```

**响应**:
```json
{
  "success": true,
  "stats": {
    "totalSalesAmount": 100000.00,
    "totalPurchaseAmount": 80000.00,
    "salesCount": 500,
    "purchaseCount": 200,
    "topProducts": [
      {
        "name": "商品名称",
        "amount": 10000.00,
        "count": 50
      }
    ]
  }
}
```

### 仪表盘统计

```
GET /api/dashboard/stats
```

**响应**:
```json
{
  "success": true,
  "stats": {
    "totalProducts": 100,
    "totalWarehouses": 3,
    "lowStockProducts": 5,
    "todaySales": 10,
    "todayPurchases": 5,
    "todaySalesAmount": 5000.00,
    "todayPurchaseAmount": 3000.00
  }
}
```

---

## 系统配置

### 初始化状态

```
GET /api/init/status
```

### 初始化数据库表

```
POST /api/init/tables
```

**请求体**:
```json
{
  "host": "localhost",
  "port": 3306,
  "database": "inventory",
  "username": "root",
  "password": "password",
  "adminUsername": "admin",
  "adminPassword": "admin123",
  "adminName": "管理员"
}
```

### 数据迁移

```
GET /api/migrate/sales-customer-fields
GET /api/migrate/customer-fields
```

### 测试数据生成

```
GET /api/seed/mock-data?customers=500&orders=1000
```

### 数据验证

```
GET /api/seed/verify
```

---

## 错误响应

所有接口在出错时返回统一格式：

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

**常见错误码**:
| HTTP 状态码 | 说明 |
|------------|------|
| 400 | 请求参数错误 |
| 401 | 未登录或登录已过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 权限说明

| 角色 | 权限范围 |
|------|---------|
| admin | 全部权限 |
| manager | 商品、采购、销售、库存、客户管理 |
| user | 查看权限、创建销售单 |
