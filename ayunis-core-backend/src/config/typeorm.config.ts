import { registerAs } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';

// Base configuration for TypeORM
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
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
export const typeormConfigRaw: DataSourceOptions =
  process.env.NODE_ENV === 'production'
    ? productionConfig
    : process.env.NODE_ENV === 'test'
      ? testConfig
      : developmentConfig;

export const typeormConfig = registerAs('typeorm', () => typeormConfigRaw);
