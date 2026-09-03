import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChangeSubscriptionCommand } from './change-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { OldSubscriptionDisposition } from 'src/iam/subscriptions/domain/value-objects/old-subscription-disposition.enum';
import {
  SubscriptionNotFoundError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import { SubscriptionFactory } from 'src/iam/subscriptions/application/services/subscription-factory.service';

@Injectable()
export class ChangeSubscriptionUseCase {
  private readonly logger = new Logger(ChangeSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionFactory: SubscriptionFactory,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: ChangeSubscriptionCommand): Promise<Subscription> {
    this.logger.log(
      {
        orgId: command.orgId,
        type: command.type,
        disposition: command.disposition,
      },
      'Changing subscription',
    );

    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );

      const current = await this.findReplaceableSubscription(command.orgId);

      // Build and validate the new subscription BEFORE touching the old one,
      // so a validation failure (e.g. too few seats) leaves the org untouched.
      const newSubscription = await this.subscriptionFactory.build(command);

      const createdSubscription = await this.subscriptionRepository.replace({
        oldSubscriptionId: current.id,
        disposition: command.disposition,
        newSubscription,
      });

      // Reflect the soft-cancellation on the in-memory entity so the emitted
      // SubscriptionCancelledEvent carries a cancelledAt matching the persisted
      // row (mirrors CancelSubscriptionUseCase). Preserve an existing timestamp
      // when the subscription was already cancelled.
      if (
        command.disposition === OldSubscriptionDisposition.CANCEL &&
        !current.cancelledAt
      ) {
        current.cancelledAt = new Date();
      }

      this.emitEvents(command, current, createdSubscription);

      return createdSubscription;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
        },
        'Subscription change failed',
      );
      throw new UnexpectedSubscriptionError(
        'Unexpected error during subscription change',
        { error: error as Error },
      );
    }
  }

  private async findReplaceableSubscription(
    orgId: Subscription['orgId'],
  ): Promise<Subscription> {
    // Target the org's latest subscription — the exact one the super-admin UI
    // displays (and offers "Change" on). It may be active, cancelled, or
    // scheduled for the future; any of those can be replaced.
    const subscription =
      await this.subscriptionRepository.findLatestByOrgId(orgId);
    if (!subscription) {
      this.logger.warn({ orgId }, 'No subscription to change');
      throw new SubscriptionNotFoundError(orgId);
    }
    return subscription;
  }

  private emitEvents(
    command: ChangeSubscriptionCommand,
    oldSubscription: Subscription,
    newSubscription: Subscription,
  ): void {
    if (command.disposition === OldSubscriptionDisposition.CANCEL) {
      this.safeEmit(
        SubscriptionCancelledEvent.EVENT_NAME,
        new SubscriptionCancelledEvent(
          command.orgId,
          toSubscriptionEventData(oldSubscription),
        ),
      );
    }
    this.safeEmit(
      SubscriptionCreatedEvent.EVENT_NAME,
      new SubscriptionCreatedEvent(
        command.orgId,
        toSubscriptionEventData(newSubscription),
      ),
    );
  }

  private safeEmit(eventName: string, event: object): void {
    this.eventEmitter.emitAsync(eventName, event).catch((err: unknown) => {
      this.logger.error(
        { err: err as Error, eventName },
        'Failed to emit subscription event',
      );
    });
  }
}
