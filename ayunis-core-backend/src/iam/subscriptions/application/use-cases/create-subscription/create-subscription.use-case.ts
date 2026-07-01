import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateSubscriptionCommand } from './create-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import {
  SubscriptionAlreadyExistsError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';

import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionCreatedEvent } from '../../events/subscription-created.event';
import { toSubscriptionEventData } from '../../mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';
import { SubscriptionFactory } from '../../services/subscription-factory.service';

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

      this.logger.debug('Subscription created successfully', {
        subscriptionId: createdSubscription.id,
        orgId: command.orgId,
        type: command.type,
      });

      this.eventEmitter
        .emitAsync(
          SubscriptionCreatedEvent.EVENT_NAME,
          new SubscriptionCreatedEvent(
            command.orgId,
            toSubscriptionEventData(createdSubscription),
          ),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit SubscriptionCreatedEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            orgId: command.orgId,
          });
        });

      return createdSubscription;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Subscription creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      });
      throw new UnexpectedSubscriptionError(
        'Unexpected error during subscription creation',
        { error: error as Error },
      );
    }
  }

  private async ensureNoExistingSubscription(
    orgId: Subscription['orgId'],
  ): Promise<void> {
    const subscriptions = await this.subscriptionRepository.findByOrgId(orgId);
    const hasNonCancelled = subscriptions.some((s) => !s.cancelledAt);
    if (hasNonCancelled) {
      this.logger.warn('Subscription already exists for organization', {
        orgId,
      });
      throw new SubscriptionAlreadyExistsError(orgId);
    }
  }
}
