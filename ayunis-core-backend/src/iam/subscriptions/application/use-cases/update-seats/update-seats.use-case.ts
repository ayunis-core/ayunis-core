import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateSeatsCommand } from './update-seats.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  InvalidSubscriptionDataError,
  TooManyUsedSeatsError,
  UnexpectedSubscriptionError,
  InvalidSubscriptionTypeError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionSeatsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-seats-updated.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import type { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';

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
    this.logger.log(
      {
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        noOfSeats: command.noOfSeats,
      },
      'Adding seats to subscription',
    );

    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );
      this.validateSeatCount(command.noOfSeats);
      const subscription = await this.findSubscription(command);
      await this.ensureEnoughSeats(command);
      await this.updateSubscription(command, subscription);
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
          noOfSeats: command.noOfSeats,
        },
        'Adding seats failed',
      );
      throw new UnexpectedSubscriptionError(
        'Unexpected error during seat addition',
      );
    }
  }

  private validateSeatCount(noOfSeats: number): void {
    if (noOfSeats <= 0) {
      this.logger.warn({ noOfSeats }, 'Invalid number of seats provided');
      throw new InvalidSubscriptionDataError(
        'Number of seats must be greater than 0',
      );
    }
  }

  private async findSubscription(
    command: UpdateSeatsCommand,
  ): Promise<SeatBasedSubscription> {
    const { subscription } = await this.getActiveSubscriptionUseCase.execute(
      new GetActiveSubscriptionQuery({
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      }),
    );
    if (!isSeatBased(subscription)) {
      throw new InvalidSubscriptionTypeError(
        'Seat updates are only allowed for seat-based subscriptions',
      );
    }
    return subscription;
  }

  private async ensureEnoughSeats(command: UpdateSeatsCommand): Promise<void> {
    const users = await this.findUsersByOrgIdUseCase.execute(
      new FindUsersByOrgIdQuery({
        orgId: command.orgId,
        pagination: { limit: 1000, offset: 0 },
      }),
    );
    const invites = await this.getInvitesByOrgUseCase.execute(
      new GetInvitesByOrgQuery({
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        onlyOpen: true,
      }),
    );
    const openInvites = invites.total ?? invites.data.length;
    const occupiedSeats = (users.total ?? users.data.length) + openInvites;
    if (command.noOfSeats < occupiedSeats) {
      this.logger.warn(
        { orgId: command.orgId, openInvites },
        'Too many used seats',
      );
      throw new TooManyUsedSeatsError({ orgId: command.orgId, openInvites });
    }
  }

  private async updateSubscription(
    command: UpdateSeatsCommand,
    subscription: SeatBasedSubscription,
  ): Promise<void> {
    const previousSeats = subscription.noOfSeats;
    subscription.noOfSeats = command.noOfSeats;
    await this.subscriptionRepository.update(subscription);
    this.logger.debug(
      {
        subscriptionId: subscription.id,
        orgId: command.orgId,
        previousSeats,
        newSeats: subscription.noOfSeats,
      },
      'Seats updated successfully',
    );
    this.emitUpdatedEvent(command.orgId, subscription);
  }

  private emitUpdatedEvent(
    orgId: UpdateSeatsCommand['orgId'],
    subscription: SeatBasedSubscription,
  ): void {
    this.eventEmitter
      .emitAsync(
        SubscriptionSeatsUpdatedEvent.EVENT_NAME,
        new SubscriptionSeatsUpdatedEvent(
          orgId,
          toSubscriptionEventData(subscription),
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, orgId },
          'Failed to emit SubscriptionSeatsUpdatedEvent',
        );
      });
  }
}
