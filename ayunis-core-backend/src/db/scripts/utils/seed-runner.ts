import dataSource from 'src/db/datasource';
import { hash } from 'bcrypt';

/**
 * Utility class for running seed scripts
 * Provides common functionality like initialization, cleanup, and hashing
 */
export class SeedRunner {
  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  }

  /**
   * Close database connection
   */
  async destroy(): Promise<void> {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  /**
   * Hash password using bcrypt (matching application logic)
   */
  async hashPassword(password: string): Promise<string> {
    return hash(password, 10);
  }

  /**
   * Check if environment is production
   */
  isProduction(): boolean {
    return (process.env.NODE_ENV ?? 'development') === 'production';
  }

  /**
   * Ensure we're not running in production
   */
  ensureNonProduction(): void {
    if (this.isProduction()) {
      throw new Error('Seeding is disabled in production');
    }
  }

  /**
   * Truncate all entity tables (for --clean flag)
   * Preserves schema and migration history — only removes row data.
   */
  async truncateAll(): Promise<void> {
    if (!dataSource.isInitialized) {
      throw new Error('DataSource must be initialized before truncating');
    }

    const tableNames = dataSource.entityMetadatas
      .map((meta) => meta.tableName)
      .filter((name) => name !== 'migrations');

    if (tableNames.length === 0) return;

    const quoted = tableNames.map((t) => `"${t}"`).join(', ');
    console.warn('🗑️  Truncating all tables...');
    await dataSource.query(`TRUNCATE ${quoted} CASCADE`);
    console.warn('✅ All tables truncated');
  }
}
