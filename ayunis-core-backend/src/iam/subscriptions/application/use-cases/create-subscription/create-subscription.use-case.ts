import { Injectable, Logger } from '@nestjs/common';
import { CreateSubscriptionCommand } from './create-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { ConfigService } from '@nestjs/config';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionAlreadyExistsError,
  InvalidSubscriptionDataError,
  SubscriptionCreationFailedError,
  SubscriptionError,
} from '../../subscription.errors';

@Injectable()
export class CreateSubscriptionUseCase {
  private readonly logger = new Logger(CreateSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<Subscription> {
    this.logger.log('Creating subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      renewalCycle: command.renewalCycle,
      noOfSeats: command.noOfSeats,
    });

    try {
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

      this.logger.debug('Checking if subscription already exists');
      const existingSubscription =
        await this.subscriptionRepository.findByOrgId(command.orgId);
      if (existingSubscription) {
        this.logger.warn('Subscription already exists for organization', {
          orgId: command.orgId,
        });
        throw new SubscriptionAlreadyExistsError(command.orgId);
      }

      this.logger.debug('Validating subscription data');
      if (command.noOfSeats <= 0) {
        this.logger.warn('Invalid number of seats provided', {
          noOfSeats: command.noOfSeats,
        });
        throw new InvalidSubscriptionDataError(
          'Number of seats must be greater than 0',
        );
      }

      const pricePerSeat =
        command.renewalCycle === RenewalCycle.MONTHLY
          ? this.configService.get<number>('subscriptions.pricePerSeatMonthly')
          : this.configService.get<number>('subscriptions.pricePerSeatYearly');

      if (!pricePerSeat) {
        this.logger.error('Price per seat not configured', {
          renewalCycle: command.renewalCycle,
        });
        throw new InvalidSubscriptionDataError('Price per seat not configured');
      }

      this.logger.debug('Creating subscription entity');
      const subscription = new Subscription({
        orgId: command.orgId,
        noOfSeats: command.noOfSeats,
        renewalCycle: command.renewalCycle,
        pricePerSeat,
        renewalCycleAnchor: new Date(),
      });

      const createdSubscription =
        await this.subscriptionRepository.create(subscription);
      this.logger.debug('Subscription created successfully', {
        subscriptionId: createdSubscription.id,
        orgId: command.orgId,
        noOfSeats: command.noOfSeats,
      });

      return createdSubscription;
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Subscription creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      });
      throw new SubscriptionCreationFailedError(
        'Unexpected error during subscription creation',
      );
    }
  }
}
