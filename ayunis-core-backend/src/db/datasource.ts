// Load env (.env.local → injected → .env.dev → .env, plus DEV_PORT_OFFSET
// derivation) before typeorm.config reads process.env. This makes the
// datasource self-sufficient for CLI runners (typeorm-ts-node-commonjs).
import 'src/config/env';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { DataSource } from 'typeorm';

const dataSource = new DataSource(typeormConfigRaw);

export default dataSource;
