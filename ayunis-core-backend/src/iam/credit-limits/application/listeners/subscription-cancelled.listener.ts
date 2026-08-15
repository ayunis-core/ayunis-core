import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OnEvent } from '@nestjs/event-emitter';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { RemoveOrgCreditLimitsUseCase } from '../use-cases/remove-org-credit-limits/remove-org-credit-limits.use-case';
import { RemoveOrgCreditLimitsCommand } from '../use-cases/remove-org-credit-limits/remove-org-credit-limits.command';

/**
 * When an org cancels its usage-based subscription, its credit limits no longer
 * apply — remove them so stale rows can't linger. The runtime guard already
 * refuses to enforce limits for non-usage-based orgs; this keeps the data clean
 * at the source. Seat-based cancellations are ignored (they never have limits).
 */
@Injectable()
export class SubscriptionCancelledListener {
  constructor(
    @InjectPinoLogger(SubscriptionCancelledListener.name)
    private readonly logger: PinoLogger,
    private readonly removeOrgCreditLimitsUseCase: RemoveOrgCreditLimitsUseCase,
  ) {}

  @OnEvent(SubscriptionCancelledEvent.EVENT_NAME)
  async handleSubscriptionCancelled(
    event: SubscriptionCancelledEvent,
  ): Promise<void> {
    if (event.payload.type !== SubscriptionType.USAGE_BASED) {
      return;
    }

    this.logger.info(
      {
        orgId: event.orgId,
      },
      'Clearing credit limits after usage-based cancellation',
    );

    await this.removeOrgCreditLimitsUseCase.execute(
      new RemoveOrgCreditLimitsCommand(event.orgId),
    );
  }
}
