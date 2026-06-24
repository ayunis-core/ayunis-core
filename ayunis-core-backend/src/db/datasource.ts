// Load env (.env.dev → .env) before typeorm.config reads process.env. This
// makes the datasource self-sufficient for CLI runners (typeorm-ts-node-commonjs)
// that don't preload env-register.
import '../config/env';
import { typeormConfigRaw } from '../config/typeorm.config';
import { DataSource } from 'typeorm';
import type { WithLengthColumnType } from 'typeorm/driver/types/ColumnTypes';

const dataSource = new DataSource(typeormConfigRaw);

// Apply the vector type hack for migrations
// This is the same hack used in app.module.ts but applied to the standalone datasource
dataSource.driver.supportedDataTypes.push('vector' as WithLengthColumnType);
dataSource.driver.withLengthColumnTypes.push('vector' as WithLengthColumnType);

export default dataSource;
