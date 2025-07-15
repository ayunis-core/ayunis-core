import { Injectable, Logger } from '@nestjs/common';
import { UpdateSeatsCommand } from './update-seats.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionNotFoundError,
  InvalidSubscriptionDataError,
  TooManyUsedSeatsError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetActiveSubscriptionQuery } from '../get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateSeatsUseCase {
  private readonly logger = new Logger(UpdateSeatsUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
  ) {}

  async execute(command: UpdateSeatsCommand): Promise<void> {
    this.logger.log('Adding seats to subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      noOfSeats: command.noOfSeats,
    });

    try {
      this.logger.debug('Validating seat count');
      if (command.noOfSeats <= 0) {
        this.logger.warn('Invalid number of seats provided', {
          noOfSeats: command.noOfSeats,
        });
        throw new InvalidSubscriptionDataError(
          'Number of seats must be greater than 0',
        );
      }

      this.logger.debug('Checking if user is from organization');
      const isFromOrg = await this.isFromOrgUseCase.execute(
        new IsFromOrgQuery({
          userId: command.requestingUserId,
          orgId: command.orgId,
        }),
      );
      if (!isFromOrg) {
        this.logger.warn('Unauthorized subscription access attempt', {
          userId: command.requestingUserId,
          orgId: command.orgId,
        });
        throw new UnauthorizedSubscriptionAccessError(
          command.requestingUserId,
          command.orgId,
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

      const users = await this.findUsersByOrgIdUseCase.execute(
        new FindUsersByOrgIdQuery(command.orgId),
      );
      const openInvites = await this.getInvitesByOrgUseCase.execute(
        new GetInvitesByOrgQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
          onlyOpen: true,
        }),
      );
      if (command.noOfSeats < users.length + openInvites.length) {
        this.logger.warn('Too many used seats', {
          orgId: command.orgId,
          openInvites: openInvites,
        });
        throw new TooManyUsedSeatsError({
          orgId: command.orgId,
          openInvites: openInvites.length,
        });
      }

      this.logger.debug('Updating seats of subscription', {
        currentSeats: subscription.noOfSeats,
        newSeats: command.noOfSeats,
      });

      subscription.noOfSeats = command.noOfSeats;
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Seats added successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
        totalSeats: subscription.noOfSeats,
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
