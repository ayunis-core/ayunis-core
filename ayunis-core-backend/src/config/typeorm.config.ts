import { registerAs } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import {
  parseNonNegativeIntWithDefault,
  parsePositiveIntWithDefault,
} from 'src/common/util/number.util';

// Base configuration for TypeORM
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  poolSize: parsePositiveIntWithDefault(process.env.POSTGRES_POOL_SIZE, 20),
  extra: {
    statement_timeout: parseNonNegativeIntWithDefault(
      process.env.POSTGRES_STATEMENT_TIMEOUT_MS,
      60_000,
    ),
    idle_in_transaction_session_timeout: parseNonNegativeIntWithDefault(
      process.env.POSTGRES_IDLE_TX_TIMEOUT_MS,
      60_000,
    ),
  },
};

// Development-specific configuration
const developmentConfig: DataSourceOptions = {
  ...baseConfig,
  entities: [__dirname + '/../**/*.record.{js,ts}'],
  migrations: [__dirname + '/../db/migrations/*.{js,ts}'],
  // Logging can be helpful during development
  logging: ['error', 'warn', 'migration'],
  synchronize: false,
};

// Production-specific configuration
const productionConfig: DataSourceOptions = {
  ...baseConfig,
  entities: [__dirname + '/../**/*.record.js'],
  migrations: [__dirname + '/../db/migrations/*.js'],
  // Minimal logging in production
  logging: ['error'],
  synchronize: false,
  migrationsRun: true,
};

// Test-specific configuration (same as production for migrations)
const testConfig: DataSourceOptions = {
  ...baseConfig,
  entities: [__dirname + '/../**/*.record.js'],
  migrations: [__dirname + '/../db/migrations/*.js'],
  // More verbose logging for test environment
  logging: ['error', 'warn', 'migration'],
  synchronize: false,
  migrationsRun: true, // Auto-run migrations in test environment
};

// Determine which configuration to use based on NODE_ENV
function resolveConfig(): DataSourceOptions {
  if (process.env.NODE_ENV === 'production') {
    return productionConfig;
  }
  if (process.env.NODE_ENV === 'test') {
    return testConfig;
  }
  return developmentConfig;
}

export const typeormConfigRaw: DataSourceOptions = resolveConfig();

export const typeormConfig = registerAs('typeorm', () => typeormConfigRaw);
