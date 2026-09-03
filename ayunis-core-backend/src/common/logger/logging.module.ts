import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createPinoLoggerConfig } from 'src/common/logger/pino-logger.config';

/**
 * The only place the application graph knows Pino exists. Everything else logs
 * through `Logger` from `@nestjs/common`, which `installNestLogger` points at
 * the Pino adapter exported here.
 */
@Module({
  imports: [LoggerModule.forRoot(createPinoLoggerConfig())],
})
export class LoggingModule {}
