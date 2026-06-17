import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateSeatsCommand } from './update-seats.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  InvalidSubscriptionDataError,
  TooManyUsedSeatsError,
  UnexpectedSubscriptionError,
  InvalidSubscriptionTypeError,
} from '../../subscription.errors';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetActiveSubscriptionQuery } from '../get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionSeatsUpdatedEvent } from '../../events/subscription-seats-updated.event';
import { toSubscriptionEventData } from '../../mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class UpdateSeatsUseCase {
  private readonly logger = new Logger(UpdateSeatsUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateSeatsCommand): Promise<void> {
    this.logger.log('Adding seats to subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      noOfSeats: command.noOfSeats,
    });

    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );
      this.logger.debug('Validating seat count');
      if (command.noOfSeats <= 0) {
        this.logger.warn('Invalid number of seats provided', {
          noOfSeats: command.noOfSeats,
        });
        throw new InvalidSubscriptionDataError(
          'Number of seats must be greater than 0',
        );
      }

      this.logger.debug('Finding subscription');
      const result = await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
        }),
      );
      if (!result) {
        this.logger.warn('Subscription not found', {
          orgId: command.orgId,
        });
        throw new SubscriptionNotFoundError(command.orgId);
      }
      const subscription = result.subscription;

      if (!isSeatBased(subscription)) {
        throw new InvalidSubscriptionTypeError(
          'Seat updates are only allowed for seat-based subscriptions',
        );
      }

      const usersResult = await this.findUsersByOrgIdUseCase.execute(
        new FindUsersByOrgIdQuery({
          orgId: command.orgId,
          pagination: { limit: 1000, offset: 0 },
        }),
      );
      const openInvitesResult = await this.getInvitesByOrgUseCase.execute(
        new GetInvitesByOrgQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
          onlyOpen: true,
        }),
      );
      const openInvitesCount =
        openInvitesResult.total ?? openInvitesResult.data.length;
      if (
        command.noOfSeats <
        (usersResult.total ?? usersResult.data.length) + openInvitesCount
      ) {
        this.logger.warn('Too many used seats', {
          orgId: command.orgId,
          openInvites: openInvitesCount,
        });
        throw new TooManyUsedSeatsError({
          orgId: command.orgId,
          openInvites: openInvitesCount,
        });
      }

      this.logger.debug('Updating seats of subscription', {
        currentSeats: subscription.noOfSeats,
        newSeats: command.noOfSeats,
      });

      const previousSeats = subscription.noOfSeats;
      subscription.noOfSeats = command.noOfSeats;
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Seats updated successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
        previousSeats,
        newSeats: subscription.noOfSeats,
      });

      this.eventEmitter
        .emitAsync(
          SubscriptionSeatsUpdatedEvent.EVENT_NAME,
          new SubscriptionSeatsUpdatedEvent(
            command.orgId,
            toSubscriptionEventData(subscription),
          ),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit SubscriptionSeatsUpdatedEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            orgId: command.orgId,
          });
        });
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Adding seats failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        noOfSeats: command.noOfSeats,
      });
      throw new UnexpectedSubscriptionError(
        'Unexpected error during seat addition',
      );
    }
  }
}
