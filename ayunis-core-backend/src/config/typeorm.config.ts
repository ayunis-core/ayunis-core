import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

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

// Determine which configuration to use based on NODE_ENV
export const typeormConfigRaw: DataSourceOptions =
  process.env.NODE_ENV === 'production' ? productionConfig : developmentConfig;

export const typeormConfig = registerAs('typeorm', () => typeormConfigRaw);
