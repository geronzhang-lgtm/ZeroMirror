import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader, QueryResult } from 'mysql2/promise';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 数据库配置接口
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

// 查询结果接口（兼容 Supabase 风格）
export interface DbResult<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

// 全局连接池
let pool: Pool | null = null;
let currentConfig: DatabaseConfig | null = null;

// 配置文件路径
const CONFIG_FILE = join(process.cwd(), 'db.config.json');

// 从配置文件加载数据库配置
export async function loadDatabaseConfig(): Promise<DatabaseConfig | null> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = await readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      return {
        host: config.host || 'localhost',
        port: config.port || 3306,
        database: config.database,
        username: config.username,
        password: config.password,
        ssl: config.ssl ?? false
      };
    }
  } catch (error) {
    console.error('Failed to load database config:', error);
  }
  return null;
}

// 保存数据库配置到文件
export async function saveDatabaseConfig(config: DatabaseConfig): Promise<void> {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// 删除数据库配置文件
export async function deleteDatabaseConfig(): Promise<void> {
  try {
    if (existsSync(CONFIG_FILE)) {
      await unlink(CONFIG_FILE);
    }
  } catch {
    // 忽略错误
  }
}

// 初始化连接池
export function initPool(config: DatabaseConfig): Pool {
  if (pool) {
    return pool;
  }

  currentConfig = config;
  
  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
  });

  return pool;
}

// 获取连接池（自动加载配置）
export async function getPool(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  const config = await loadDatabaseConfig();
  if (!config) {
    throw new Error('数据库未配置，请先完成系统安装');
  }

  return initPool(config);
}

// 获取客户端连接
export async function getClient(): Promise<PoolConnection> {
  const p = await getPool();
  return p.getConnection();
}

// 执行查询 - 返回数据行
export async function query<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string, 
  params?: any[]
): Promise<T> {
  const [rows] = await getPool().then(p => p.execute<T>(sql, params));
  return rows;
}

// 执行更新/插入/删除 - 返回结果头
export async function execute(
  sql: string, 
  params?: any[]
): Promise<ResultSetHeader> {
  const [result] = await getPool().then(p => p.execute<ResultSetHeader>(sql, params));
  return result;
}

// 执行查询（自动判断返回类型）
export async function queryAny<T extends QueryResult = any>(
  sql: string, 
  params?: any[]
): Promise<T> {
  const [result] = await getPool().then(p => p.execute<T>(sql, params));
  return result;
}

// 事务执行
export async function transaction<T>(callback: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getClient();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// 测试数据库连接
export async function testConnection(config: DatabaseConfig): Promise<{ success: boolean; message: string }> {
  let testPool: Pool | null = null;
  try {
    testPool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      connectionLimit: 1,
      connectTimeout: 5000,
    });

    const conn = await testPool.getConnection();
    await conn.ping();
    conn.release();
    
    return { success: true, message: '数据库连接成功' };
  } catch (error: any) {
    return { 
      success: false, 
      message: `连接失败: ${error.message || '未知错误'}` 
    };
  } finally {
    if (testPool) {
      await testPool.end();
    }
  }
}

// 关闭连接池
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    currentConfig = null;
  }
}

// 兼容 Supabase 风格的查询构建器
export function createQueryBuilder(table: string): QueryBuilder {
  return new QueryBuilder(table);
}

// 查询类型枚举
enum QueryType {
  SELECT,
  INSERT,
  UPDATE,
  DELETE
}

// 查询构建器类（模拟 Supabase 风格）
class QueryBuilder {
  private table: string;
  private selectFields: string = '*';
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orConditions: string[] = [];
  private orderClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private singleRow: boolean = false;
  private queryType: QueryType = QueryType.SELECT;
  private insertData: any | any[] | null = null;
  private updateData: any | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this.selectFields = fields || '*';
    // 注意：不要重置 queryType，因为 insert().select() 需要保持 INSERT 类型
    // 只有在没有设置其他查询类型时才设置为 SELECT
    if (this.queryType === QueryType.SELECT) {
      this.queryType = QueryType.SELECT;
    }
    return this;
  }

  eq(column: string, value: any): this {
    this.whereConditions.push(`${column} = ?`);
    this.whereParams.push(value);
    return this;
  }

  neq(column: string, value: any): this {
    this.whereConditions.push(`${column} != ?`);
    this.whereParams.push(value);
    return this;
  }

  gt(column: string, value: any): this {
    this.whereConditions.push(`${column} > ?`);
    this.whereParams.push(value);
    return this;
  }

  gte(column: string, value: any): this {
    this.whereConditions.push(`${column} >= ?`);
    this.whereParams.push(value);
    return this;
  }

  lt(column: string, value: any): this {
    this.whereConditions.push(`${column} < ?`);
    this.whereParams.push(value);
    return this;
  }

  lte(column: string, value: any): this {
    this.whereConditions.push(`${column} <= ?`);
    this.whereParams.push(value);
    return this;
  }

  like(column: string, pattern: string): this {
    this.whereConditions.push(`${column} LIKE ?`);
    this.whereParams.push(pattern);
    return this;
  }

  ilike(column: string, pattern: string): this {
    // MySQL 默认不区分大小写，直接使用 LIKE
    this.whereConditions.push(`${column} LIKE ?`);
    this.whereParams.push(pattern);
    return this;
  }

  in(column: string, values: any[]): this {
    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push(`${column} IN (${placeholders})`);
    this.whereParams.push(...values);
    return this;
  }

  is(column: string, value: null | boolean): this {
    if (value === null) {
      this.whereConditions.push(`${column} IS NULL`);
    } else {
      this.whereConditions.push(`${column} IS ${value ? 'TRUE' : 'FALSE'}`);
    }
    return this;
  }

  // OR 条件
  or(conditions: string): this {
    const parts = conditions.split(',');
    const orClauses: string[] = [];
    
    parts.forEach(part => {
      const match = part.match(/^(\w+)\.(eq|neq|gt|gte|lt|lte|like|ilike|in)\.(.+)$/);
      if (match) {
        const [, column, op, value] = match;
        
        switch (op) {
          case 'eq':
            orClauses.push(`${column} = ?`);
            this.whereParams.push(value);
            break;
          case 'neq':
            orClauses.push(`${column} != ?`);
            this.whereParams.push(value);
            break;
          case 'like':
          case 'ilike':
            orClauses.push(`${column} LIKE ?`);
            this.whereParams.push(value);
            break;
          case 'gt':
            orClauses.push(`${column} > ?`);
            this.whereParams.push(value);
            break;
          case 'gte':
            orClauses.push(`${column} >= ?`);
            this.whereParams.push(value);
            break;
          case 'lt':
            orClauses.push(`${column} < ?`);
            this.whereParams.push(value);
            break;
          case 'lte':
            orClauses.push(`${column} <= ?`);
            this.whereParams.push(value);
            break;
        }
      }
    });
    
    if (orClauses.length > 0) {
      this.orConditions.push(`(${orClauses.join(' OR ')})`);
    }
    
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? 'DESC' : 'ASC';
    this.orderClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  range(from: number, to: number): this {
    this.limitClause = `LIMIT ${to - from + 1}`;
    this.offsetClause = `OFFSET ${from}`;
    return this;
  }

  offset(count: number): this {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  single(): this {
    this.singleRow = true;
    this.limitClause = 'LIMIT 1';
    return this;
  }

  maybeSingle(): this {
    this.singleRow = true;
    this.limitClause = 'LIMIT 1';
    return this;
  }

  // 获取计数
  async count(options?: { head?: boolean }): Promise<{ count: number | null; error: any }> {
    try {
      const allConditions = [...this.whereConditions, ...this.orConditions];
      let sql = `SELECT COUNT(*) as count FROM ${this.table}`;
      
      if (allConditions.length > 0) {
        sql += ` WHERE ${allConditions.join(' AND ')}`;
      }
      
      const rows = await query<RowDataPacket[]>(sql, this.whereParams);
      
      return { count: rows[0].count as number, error: null };
    } catch (error: any) {
      return { count: null, error: { message: error.message, code: error.code } };
    }
  }

  // 插入数据 - 返回 this 以支持链式调用
  insert(data: any | any[]): this {
    this.insertData = data;
    this.queryType = QueryType.INSERT;
    return this;
  }

  // 更新数据 - 返回 this 以支持链式调用
  update(data: any): this {
    this.updateData = data;
    this.queryType = QueryType.UPDATE;
    return this;
  }

  // 删除数据 - 返回 this 以支持链式调用
  delete(): this {
    this.queryType = QueryType.DELETE;
    return this;
  }

  // 执行查询（返回 Promise）
  private async executeQuery(): Promise<DbResult> {
    try {
      switch (this.queryType) {
        case QueryType.INSERT:
          return await this.executeInsert();
        case QueryType.UPDATE:
          return await this.executeUpdate();
        case QueryType.DELETE:
          return await this.executeDelete();
        default:
          return await this.executeSelect();
      }
    } catch (error: any) {
      return { data: null, error: { message: error.message, code: error.code } };
    }
  }

  // 执行 SELECT 查询
  private async executeSelect(): Promise<DbResult> {
    const allConditions = [...this.whereConditions, ...this.orConditions];
    let sql = `SELECT ${this.selectFields} FROM ${this.table}`;
    
    if (allConditions.length > 0) {
      sql += ` WHERE ${allConditions.join(' AND ')}`;
    }
    
    if (this.orderClause) {
      sql += ` ${this.orderClause}`;
    }
    
    if (this.limitClause) {
      sql += ` ${this.limitClause}`;
    }
    
    if (this.offsetClause) {
      sql += ` ${this.offsetClause}`;
    }

    const rows = await query<RowDataPacket[]>(sql, this.whereParams);
    
    let data: any = rows;
    if (this.singleRow) {
      data = rows[0] || null;
    }
    
    return { data, error: null };
  }

  // 执行 INSERT 查询
  private async executeInsert(): Promise<DbResult> {
    if (!this.insertData) {
      return { data: null, error: { message: 'No data to insert' } };
    }

    const records = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
    const results: any[] = [];
    
    for (const record of records) {
      const keys = Object.keys(record);
      const values = Object.values(record);
      const placeholders = values.map(() => '?').join(', ');
      const columns = keys.join(', ');
      
      const sql = `INSERT INTO ${this.table} (${columns}) VALUES (${placeholders})`;
      const result = await execute(sql, values);
      
      // 尝试查询插入的记录
      // 对于 UUID 主键，insertId 可能是 0，所以我们需要使用其他方式查询
      let insertedRecord: any = null;
      
      // 1. 如果记录有 id 字段，优先使用 id 查询
      if (record.id) {
        try {
          const rows = await query<RowDataPacket[]>(
            `SELECT * FROM ${this.table} WHERE id = ?`,
            [record.id]
          );
          if (rows.length > 0) {
            insertedRecord = rows[0];
          }
        } catch {
          // 查询失败，使用插入的数据
        }
      }
      
      // 2. 如果 id 查询失败且 insertId 有效（自增主键），使用 insertId 查询
      if (!insertedRecord && result.insertId && result.insertId > 0) {
        try {
          const rows = await query<RowDataPacket[]>(
            `SELECT * FROM ${this.table} WHERE id = ?`,
            [result.insertId]
          );
          if (rows.length > 0) {
            insertedRecord = rows[0];
          }
        } catch {
          // 查询失败
        }
      }
      
      // 3. 如果都无法查询，返回插入的数据（带有可能的 insertId）
      if (!insertedRecord) {
        insertedRecord = { ...record };
        if (result.insertId && result.insertId > 0) {
          insertedRecord.id = result.insertId;
        }
      }
      
      results.push(insertedRecord);
    }
    
    return { data: Array.isArray(this.insertData) ? results : results[0], error: null };
  }

  // 执行 UPDATE 查询
  private async executeUpdate(): Promise<DbResult> {
    if (!this.updateData) {
      return { data: null, error: { message: 'No data to update' } };
    }

    const keys = Object.keys(this.updateData);
    const values = Object.values(this.updateData);
    
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    
    let sql = `UPDATE ${this.table} SET ${setClause}`;
    const params = [...values];
    
    const allConditions = [...this.whereConditions, ...this.orConditions];
    if (allConditions.length > 0) {
      sql += ` WHERE ${allConditions.join(' AND ')}`;
      params.push(...this.whereParams);
    }
    
    await execute(sql, params);
    
    // MySQL 需要单独查询更新的记录
    const selectSql = `SELECT * FROM ${this.table}`;
    const selectParams: any[] = [];
    
    if (allConditions.length > 0) {
      selectParams.push(...this.whereParams);
    }
    
    const rows = await query<RowDataPacket[]>(
      allConditions.length > 0 ? `${selectSql} WHERE ${allConditions.join(' AND ')}` : selectSql, 
      selectParams
    );
    
    return { data: rows, error: null };
  }

  // 执行 DELETE 查询
  private async executeDelete(): Promise<DbResult> {
    let sql = `DELETE FROM ${this.table}`;
    const params: any[] = [];
    
    const allConditions = [...this.whereConditions, ...this.orConditions];
    if (allConditions.length > 0) {
      sql += ` WHERE ${allConditions.join(' AND ')}`;
      params.push(...this.whereParams);
    }
    
    // 先查询要删除的记录
    const selectSql = sql.replace('DELETE FROM', 'SELECT * FROM');
    const rows = await query<RowDataPacket[]>(selectSql, params);
    
    // 执行删除
    await execute(sql, params);
    
    return { data: rows, error: null };
  }

  // 让对象可以被 await（兼容 Supabase 风格）
  get [Symbol.toStringTag](): string {
    return 'QueryBuilder';
  }

  // 实现 then 方法让对象可以被 await
  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled, onrejected);
  }
}

// 数据库客户端（模拟 Supabase 风格）
export function getDatabaseClient(): { 
  from: (table: string) => QueryBuilder;
  rpc: (name: string, params?: any) => Promise<never>;
} {
  return {
    from: (table: string) => createQueryBuilder(table),
    rpc: async (name: string, params?: any) => {
      throw new Error('RPC not implemented');
    }
  };
}

// 导出兼容接口
export { getDatabaseClient as getSupabaseClient };
