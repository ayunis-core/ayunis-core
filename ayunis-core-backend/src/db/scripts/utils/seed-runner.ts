import dataSource from 'src/db/datasource';
import { hash } from 'bcrypt';

export class SeedRunner {
  async initialize(): Promise<void> {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  }

  async destroy(): Promise<void> {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password, 10);
  }

  isProduction(): boolean {
    return (process.env.NODE_ENV ?? 'development') === 'production';
  }

  ensureNonProduction(): void {
    if (this.isProduction()) {
      throw new Error('Seeding is disabled in production');
    }
  }

  async truncateAll(): Promise<void> {
    if (!dataSource.isInitialized) {
      throw new Error('DataSource must be initialized before truncating');
    }

    const tableNames = dataSource.entityMetadatas
      .map((meta) => meta.tableName)
      .filter((name) => name !== 'migrations');

    if (tableNames.length === 0) {
      return;
    }

    const quoted = tableNames.map((t) => `"${t}"`).join(', ');
    console.warn('🗑️  Truncating all tables...');
    await dataSource.query(`TRUNCATE ${quoted} CASCADE`);
    console.warn('✅ All tables truncated');
  }
}
