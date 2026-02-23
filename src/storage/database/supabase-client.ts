import { 
  getDatabaseClient, 
  getPool, 
  loadDatabaseConfig, 
  saveDatabaseConfig,
  deleteDatabaseConfig,
  testConnection,
  query,
  execute,
  transaction,
  getClient,
  closePool,
  initPool,
  type DatabaseConfig,
  type DbResult
} from './db-client';

// 重新导出 db-client 的所有功能
export { 
  getDatabaseClient, 
  getPool, 
  loadDatabaseConfig, 
  saveDatabaseConfig,
  deleteDatabaseConfig,
  testConnection,
  query,
  execute,
  transaction,
  getClient,
  closePool,
  initPool
};

// 导出类型
export type { DatabaseConfig, DbResult };

// 兼容原有 API 的别名
export const getSupabaseClient = getDatabaseClient;

// 检查数据库是否已配置
export async function isDatabaseConfigured(): Promise<boolean> {
  const config = await loadDatabaseConfig();
  return config !== null;
}

// 初始化数据库配置
export async function initDatabase(config: DatabaseConfig): Promise<void> {
  await saveDatabaseConfig(config);
  initPool(config);
}
