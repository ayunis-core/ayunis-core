import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IsUsageBasedSubscriptionQuery } from './is-usage-based-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { isActive } from '../../util/is-active';
import { isUsageBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedSubscriptionError } from '../../subscription.errors';

/**
 * Returns true iff the organization has an active usage-based subscription.
 * Used to short-circuit fair-use quota enforcement for orgs that are already
 * capped by their purchased credit budget.
 */
@Injectable()
export class IsUsageBasedSubscriptionUseCase {
  constructor(
    @InjectPinoLogger(IsUsageBasedSubscriptionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async execute(query: IsUsageBasedSubscriptionQuery): Promise<boolean> {
    try {
      const subscriptions = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      return subscriptions.filter(isActive).some(isUsageBased);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to determine subscription type',
      );
      throw new UnexpectedSubscriptionError((error as Error).message, {
        orgId: query.orgId,
      });
    }
  }
}
