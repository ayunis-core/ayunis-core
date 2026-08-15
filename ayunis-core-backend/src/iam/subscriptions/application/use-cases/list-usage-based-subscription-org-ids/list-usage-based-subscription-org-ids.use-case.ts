import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSubscriptionError } from '../../subscription.errors';

/**
 * Lists the ids of all orgs holding an active usage-based subscription — the
 * orgs whose credit budgets can cross alert thresholds.
 */
@Injectable()
export class ListUsageBasedSubscriptionOrgIdsUseCase {
  constructor(
    @InjectPinoLogger(ListUsageBasedSubscriptionOrgIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(): Promise<UUID[]> {
    this.logger.info('execute');
    try {
      return await this.subscriptionRepository.findActiveUsageBasedOrgIds(
        new Date(),
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to list orgs with usage-based subscriptions',
      );
      throw new UnexpectedSubscriptionError((error as Error).message);
    }
  }
}
