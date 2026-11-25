import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { checkIn } from '@appsignal/nodejs';
import { brokerFailureDetails } from 'src/iam/sso/application/sso.errors';
import { SweepUnlinkedBrokerIdentitiesUseCase } from 'src/iam/sso/application/use-cases/sweep-unlinked-broker-identities/sweep-unlinked-broker-identities.use-case';

/**
 * Nightly job that deletes broker identities never linked to a Core user,
 * including identities whose deletion failed when their Core user was
 * deleted. Runs at 1 AM, before the storage sweeps. An in-memory lock
 * prevents overlapping executions.
 */
@Injectable()
export class UnlinkedBrokerIdentitySweepTask {
  private readonly logger = new Logger(UnlinkedBrokerIdentitySweepTask.name);

  private isRunning = false;

  constructor(
    private readonly sweepUnlinkedBrokerIdentities: SweepUnlinkedBrokerIdentitiesUseCase,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Unlinked broker identity sweep already running, skipping this execution',
      );
      return;
    }

    this.isRunning = true;
    try {
      await checkIn.cron('unlinked_broker_identity_sweep', async () => {
        await this.sweepUnlinkedBrokerIdentities.execute();
      });
    } catch (error) {
      this.logger.error(
        { ...brokerFailureDetails(error), err: error as Error },
        'Unlinked broker identity sweep failed',
      );
    } finally {
      this.isRunning = false;
    }
  }
}
