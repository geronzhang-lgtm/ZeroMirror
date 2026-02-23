import { pgTable, serial, varchar, timestamp, integer, boolean, decimal, text, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表（保留）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ==================== 用户管理模块 ====================

// 用户表
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 20 }).notNull().default('user'), // 'admin', 'manager', 'user'
  isActive: boolean("is_active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("users_username_idx").on(table.username),
  index("users_email_idx").on(table.email),
]);

// 登录日志表
export const loginLogs = pgTable("login_logs", {
  id: serial().notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  loginTime: timestamp("login_time", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  failReason: varchar("fail_reason", { length: 255 }),
}, (table) => [
  index("login_logs_user_id_idx").on(table.userId),
  index("login_logs_login_time_idx").on(table.loginTime),
]);

// ==================== 仓库管理模块 ====================

// 仓库表
export const warehouses = pgTable("warehouses", {
  id: serial().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  address: varchar("address", { length: 255 }),
  manager: varchar("manager", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  capacity: integer("capacity").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("warehouses_code_idx").on(table.code),
]);

// ==================== 商品管理模块 ====================

// 商品分类表
export const categories = pgTable("categories", {
  id: serial().notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  parentId: integer("parent_id"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("categories_parent_id_idx").on(table.parentId),
]);

// 商品表
export const products = pgTable("products", {
  id: serial().notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  categoryId: integer("category_id"),
  specification: varchar("specification", { length: 100 }),
  unit: varchar("unit", { length: 20 }).notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull().default('0.00'),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull().default('0.00'),
  minStock: integer("min_stock").default(0),
  maxStock: integer("max_stock").default(0),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("products_sku_idx").on(table.sku),
  index("products_category_id_idx").on(table.categoryId),
]);

// ==================== 供应商与客户管理 ====================

// 供应商表
export const suppliers = pgTable("suppliers", {
  id: serial().notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  contact: varchar("contact", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  address: varchar("address", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("suppliers_code_idx").on(table.code),
]);

// 客户表
export const customers = pgTable("customers", {
  id: serial().notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  contact: varchar("contact", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  wechat: varchar("wechat", { length: 50 }),
  email: varchar("email", { length: 100 }),
  address: varchar("address", { length: 500 }),
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).default('0.00'),
  totalPurchases: decimal("total_purchases", { precision: 12, scale: 2 }).default('0.00'),
  purchaseCount: integer("purchase_count").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("customers_code_idx").on(table.code),
]);

// ==================== 进货管理模块 ====================

// 采购订单表
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial().notNull(),
  orderNo: varchar("order_no", { length: 30 }).notNull().unique(),
  supplierId: integer("supplier_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default('0.00'),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, confirmed, received, cancelled
  remark: text("remark"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("purchase_orders_order_no_idx").on(table.orderNo),
  index("purchase_orders_supplier_id_idx").on(table.supplierId),
  index("purchase_orders_warehouse_id_idx").on(table.warehouseId),
]);

// 采购订单明细表
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial().notNull(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: integer("received_quantity").default(0),
}, (table) => [
  index("purchase_order_items_order_id_idx").on(table.orderId),
  index("purchase_order_items_product_id_idx").on(table.productId),
]);

// ==================== 销售管理模块 ====================

// 销售订单表
export const salesOrders = pgTable("sales_orders", {
  id: serial().notNull(),
  orderNo: varchar("order_no", { length: 30 }).notNull().unique(),
  customerId: integer("customer_id"),
  customerName: varchar("customer_name", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerWechat: varchar("customer_wechat", { length: 50 }),
  customerAddress: varchar("customer_address", { length: 255 }),
  warehouseId: integer("warehouse_id").notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default('0.00'),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, confirmed, shipped, cancelled
  remark: text("remark"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("sales_orders_order_no_idx").on(table.orderNo),
  index("sales_orders_customer_id_idx").on(table.customerId),
  index("sales_orders_warehouse_id_idx").on(table.warehouseId),
]);

// 销售订单明细表
export const salesOrderItems = pgTable("sales_order_items", {
  id: serial().notNull(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  shippedQuantity: integer("shipped_quantity").default(0),
}, (table) => [
  index("sales_order_items_order_id_idx").on(table.orderId),
  index("sales_order_items_product_id_idx").on(table.productId),
]);

// ==================== 库存管理模块 ====================

// 库存表
export const inventory = pgTable("inventory", {
  id: serial().notNull(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  lockedQuantity: integer("locked_quantity").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("inventory_product_id_idx").on(table.productId),
  index("inventory_warehouse_id_idx").on(table.warehouseId),
]);

// 库存交易记录表
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial().notNull(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // purchase, sale, transfer_in, transfer_out, adjustment
  quantity: integer("quantity").notNull(),
  beforeQuantity: integer("before_quantity").notNull(),
  afterQuantity: integer("after_quantity").notNull(),
  referenceType: varchar("reference_type", { length: 20 }), // purchase_order, sales_order, transfer
  referenceId: integer("reference_id"),
  userId: varchar("user_id", { length: 36 }).notNull(),
  remark: text("remark"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("inventory_transactions_product_id_idx").on(table.productId),
  index("inventory_transactions_warehouse_id_idx").on(table.warehouseId),
  index("inventory_transactions_created_at_idx").on(table.createdAt),
]);

// ==================== 库存调拨 ====================

// 库存调拨表
export const stockTransfers = pgTable("stock_transfers", {
  id: serial().notNull(),
  transferNo: varchar("transfer_no", { length: 30 }).notNull().unique(),
  fromWarehouseId: integer("from_warehouse_id").notNull(),
  toWarehouseId: integer("to_warehouse_id").notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, completed, cancelled
  remark: text("remark"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("stock_transfers_transfer_no_idx").on(table.transferNo),
  index("stock_transfers_from_warehouse_id_idx").on(table.fromWarehouseId),
  index("stock_transfers_to_warehouse_id_idx").on(table.toWarehouseId),
]);

// 库存调拨明细表
export const stockTransferItems = pgTable("stock_transfer_items", {
  id: serial().notNull(),
  transferId: integer("transfer_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
}, (table) => [
  index("stock_transfer_items_transfer_id_idx").on(table.transferId),
  index("stock_transfer_items_product_id_idx").on(table.productId),
]);

// ==================== 系统日志 ====================

// 操作日志表
export const operationLogs = pgTable("operation_logs", {
  id: serial().notNull(),
  userId: varchar("user_id", { length: 36 }),
  module: varchar("module", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  description: text("description"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  requestData: text("request_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("operation_logs_user_id_idx").on(table.userId),
  index("operation_logs_module_idx").on(table.module),
  index("operation_logs_created_at_idx").on(table.createdAt),
]);
