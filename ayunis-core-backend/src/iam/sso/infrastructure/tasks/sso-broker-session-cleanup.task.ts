import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SsoBrokerSessionsRepository } from 'src/iam/sso/application/ports/sso-broker-sessions.repository';

@Injectable()
export class SsoBrokerSessionCleanupTask {
  constructor(
    @InjectPinoLogger(SsoBrokerSessionCleanupTask.name)
    private readonly logger: PinoLogger,
    private readonly sessions: SsoBrokerSessionsRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async handleCleanup(): Promise<void> {
    try {
      const deleted = await this.sessions.deleteExpired(new Date());
      this.logger.info({ deleted }, 'Expired SSO broker sessions deleted');
    } catch (error) {
      this.logger.error({ err: error }, 'SSO broker session cleanup failed');
    }
  }
}
