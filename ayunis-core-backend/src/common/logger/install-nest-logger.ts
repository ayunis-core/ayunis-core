import type { INestApplicationContext } from '@nestjs/common';
import { Logger as NestPinoLogger } from 'nestjs-pino';

/**
 * Bootstraps must create the application with `bufferLogs: true` so framework
 * logs emitted while the graph initializes are replayed through Pino rather
 * than Nest's console logger.
 */
export function installNestLogger(app: INestApplicationContext): void {
  app.useLogger(app.get(NestPinoLogger));
  app.flushLogs();
}
