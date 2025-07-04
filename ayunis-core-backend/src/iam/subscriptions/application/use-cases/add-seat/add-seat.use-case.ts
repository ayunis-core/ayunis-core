import { Injectable, Logger } from '@nestjs/common';
import { AddSeatCommand } from './add-seat.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionNotFoundError,
  InvalidSubscriptionDataError,
  SubscriptionUpdateFailedError,
  SubscriptionError,
} from '../../subscription.errors';

@Injectable()
export class AddSeatUseCase {
  private readonly logger = new Logger(AddSeatUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
  ) {}

  async execute(command: AddSeatCommand): Promise<void> {
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
      const subscription = await this.subscriptionRepository.findByOrgId(
        command.orgId,
      );
      if (!subscription) {
        this.logger.warn('Subscription not found', {
          orgId: command.orgId,
        });
        throw new SubscriptionNotFoundError(command.orgId);
      }

      this.logger.debug('Adding seats to subscription', {
        currentSeats: subscription.noOfSeats,
        additionalSeats: command.noOfSeats,
        newTotal: subscription.noOfSeats + command.noOfSeats,
      });

      subscription.noOfSeats += command.noOfSeats;
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Seats added successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
        totalSeats: subscription.noOfSeats,
      });
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Adding seats failed', {
        error,
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        noOfSeats: command.noOfSeats,
      });
      throw new SubscriptionUpdateFailedError(
        'Unexpected error during seat addition',
      );
    }
  }
}
