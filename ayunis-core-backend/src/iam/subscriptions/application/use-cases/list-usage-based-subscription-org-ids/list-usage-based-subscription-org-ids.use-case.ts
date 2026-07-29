import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(
    ListUsageBasedSubscriptionOrgIdsUseCase.name,
  );

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(): Promise<UUID[]> {
    this.logger.log('execute');
    try {
      return await this.subscriptionRepository.findActiveUsageBasedOrgIds(
        new Date(),
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        'Failed to list orgs with usage-based subscriptions',
        error,
      );
      throw new UnexpectedSubscriptionError((error as Error).message);
    }
  }
}
