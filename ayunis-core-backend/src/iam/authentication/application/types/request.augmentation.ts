import type { ActiveApiKey } from '../../domain/active-api-key.entity';

declare module 'express-serve-static-core' {
  interface Request {
    apiKey?: ActiveApiKey;
  }
}
