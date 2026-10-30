import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import type { SubscriptionEventData } from 'src/iam/subscriptions/application/events/subscription-event-data.types';
import { SubscriptionExpiredEvent } from 'src/iam/subscriptions/application/events/subscription-expired.event';
import { IsUsageBasedSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.query';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { RemoveOrgCreditLimitsCommand } from 'src/iam/credit-limits/application/use-cases/remove-org-credit-limits/remove-org-credit-limits.command';
import { RemoveOrgCreditLimitsUseCase } from 'src/iam/credit-limits/application/use-cases/remove-org-credit-limits/remove-org-credit-limits.use-case';

interface SubscriptionEndedEvent {
  orgId: UUID;
  payload: SubscriptionEventData;
}

@Injectable()
export class SubscriptionEndedListener {
  private readonly logger = new Logger(SubscriptionEndedListener.name);

  constructor(
    private readonly removeOrgCreditLimitsUseCase: RemoveOrgCreditLimitsUseCase,
    private readonly isUsageBasedSubscriptionUseCase: IsUsageBasedSubscriptionUseCase,
  ) {}

  @OnEvent(SubscriptionCancelledEvent.EVENT_NAME, { suppressErrors: false })
  async handleSubscriptionCancelled(
    event: SubscriptionCancelledEvent,
  ): Promise<void> {
    await this.clearUsageBasedLimits(event, 'cancellation');
  }

  @OnEvent(SubscriptionExpiredEvent.EVENT_NAME, { suppressErrors: false })
  async handleSubscriptionExpired(
    event: SubscriptionExpiredEvent,
  ): Promise<void> {
    await this.clearUsageBasedLimits(event, 'expiry');
  }

  // Limits belong to the org, not to one subscription: when a successor is
  // already serving (a trial that ran out with the paid term in place), the
  // ended subscription must not take the successor's caps with it. The
  // usage-based check reads the database on every host; the has-active use
  // case answers true on self-hosted installs without looking.
  private async clearUsageBasedLimits(
    event: SubscriptionEndedEvent,
    cause: 'cancellation' | 'expiry',
  ): Promise<void> {
    if (event.payload.type !== SubscriptionType.USAGE_BASED) {
      return;
    }
    const successorServes = await this.isUsageBasedSubscriptionUseCase.execute(
      new IsUsageBasedSubscriptionQuery(event.orgId),
    );
    if (successorServes) {
      this.logger.log(
        { orgId: event.orgId, cause },
        'Keeping credit limits: another usage-based subscription serves the org',
      );
      return;
    }
    this.logger.log(
      { orgId: event.orgId, cause },
      'Clearing credit limits after usage-based subscription ended',
    );
    await this.removeOrgCreditLimitsUseCase.execute(
      new RemoveOrgCreditLimitsCommand(event.orgId),
    );
  }
}
