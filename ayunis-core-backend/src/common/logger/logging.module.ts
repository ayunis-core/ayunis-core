import { Http2TransportDiagnostics } from 'src/common/http/http2-transport-diagnostics';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { createPinoLoggerConfig } from 'src/common/logger/pino-logger.config';

/**
 * The only place the application graph knows Pino exists. Everything else logs
 * through `Logger` from `@nestjs/common`, which `installNestLogger` points at
 * the Pino adapter exported here.
 */
@Module({
  imports: [ConfigModule, LoggerModule.forRoot(createPinoLoggerConfig())],
  providers: [Http2TransportDiagnostics],
})
export class LoggingModule {}
