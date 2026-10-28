import { Injectable, Logger } from '@nestjs/common';
import { Transactional, Propagation } from '@nestjs-cls/transactional';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SubscriptionExpiredEvent } from 'src/iam/subscriptions/application/events/subscription-expired.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { UnexpectedSubscriptionError } from 'src/iam/subscriptions/application/subscription.errors';

@Injectable()
export class ProcessExpiredSubscriptionsUseCase {
  private readonly logger = new Logger(ProcessExpiredSubscriptionsUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSubscriptionError)
  async execute(): Promise<number> {
    const now = new Date();
    const ids = await this.subscriptionRepository.findUnprocessedExpiryIds(now);
    let processed = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        if (await this.announce(id, now)) processed++;
      } catch (error) {
        failed++;
        this.logger.error(
          { err: error as Error, subscriptionId: id },
          'Subscription expiry failed; a later sweep will retry',
        );
      }
    }
    if (failed > 0) {
      throw new UnexpectedSubscriptionError(
        `${failed} subscription expiries failed`,
      );
    }
    return processed;
  }

  // Keep each claim locked and uncommitted until its listeners succeed. A
  // failure or process crash rolls it back; concurrent sweeps then recheck it.
  @Transactional(Propagation.RequiresNew)
  private async announce(id: UUID, now: Date): Promise<boolean> {
    const subscription =
      await this.subscriptionRepository.claimUnprocessedExpiry(id, now);
    if (!subscription) return false;
    const event = new SubscriptionExpiredEvent(
      subscription.orgId,
      toSubscriptionEventData(subscription),
    );
    const listeners = this.eventEmitter.listeners(
      SubscriptionExpiredEvent.EVENT_NAME,
    );
    if (listeners.length === 0)
      throw new Error('No subscription expiry listeners registered');
    // emitAsync rejects before other listeners settle. Run them sequentially so
    // a rollback cannot race a listener still writing through the transaction.
    for (const listener of listeners) await Promise.resolve(listener(event));
    return true;
  }
}
