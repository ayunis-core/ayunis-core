import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateSubscriptionCommand } from './create-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import {
  SubscriptionAlreadyExistsError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';

import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionCreatedEvent } from 'src/iam/subscriptions/application/events/subscription-created.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import { SubscriptionFactory } from 'src/iam/subscriptions/application/services/subscription-factory.service';

@Injectable()
export class CreateSubscriptionUseCase {
  private readonly logger = new Logger(CreateSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionFactory: SubscriptionFactory,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<Subscription> {
    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );

      await this.ensureNoExistingSubscription(command.orgId);

      const subscription = await this.subscriptionFactory.build(command);

      const createdSubscription =
        await this.subscriptionRepository.create(subscription);

      this.logger.debug(
        {
          subscriptionId: createdSubscription.id,
          orgId: command.orgId,
          type: command.type,
        },
        'Subscription created successfully',
      );

      this.emitCreatedEvent(command, createdSubscription);
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
        'Subscription creation failed',
      );
      throw new UnexpectedSubscriptionError(
        'Unexpected error during subscription creation',
        { error: error as Error },
      );
    }
  }

  private emitCreatedEvent(
    command: CreateSubscriptionCommand,
    subscription: Subscription,
  ): void {
    this.eventEmitter
      .emitAsync(
        SubscriptionCreatedEvent.EVENT_NAME,
        new SubscriptionCreatedEvent(
          command.orgId,
          toSubscriptionEventData(subscription),
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, orgId: command.orgId },
          'Failed to emit SubscriptionCreatedEvent',
        );
      });
  }

  private async ensureNoExistingSubscription(
    orgId: Subscription['orgId'],
  ): Promise<void> {
    const subscriptions = await this.subscriptionRepository.findByOrgId(orgId);
    const hasNonCancelled = subscriptions.some((s) => !s.cancelledAt);
    if (hasNonCancelled) {
      this.logger.warn(
        {
          orgId,
        },
        'Subscription already exists for organization',
      );
      throw new SubscriptionAlreadyExistsError(orgId);
    }
  }
}
