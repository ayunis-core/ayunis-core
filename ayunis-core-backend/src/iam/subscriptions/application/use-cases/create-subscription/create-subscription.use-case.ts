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
  UnexpectedSubscriptionError,
  TooManyUsedSeatsError,
} from '../../subscription.errors';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { HasActiveSubscriptionQuery } from '../has-active-subscription/has-active-subscription.query';
import { HasActiveSubscriptionUseCase } from '../has-active-subscription/has-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';

@Injectable()
export class CreateSubscriptionUseCase {
  private readonly logger = new Logger(CreateSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
    private readonly configService: ConfigService,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<Subscription> {
    this.logger.log('Creating subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      renewalCycle: RenewalCycle.YEARLY,
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
      const hasActiveSubscription =
        await this.hasActiveSubscriptionUseCase.execute(
          new HasActiveSubscriptionQuery(command.orgId),
        );
      if (hasActiveSubscription) {
        this.logger.warn('Subscription already exists for organization', {
          orgId: command.orgId,
        });
        throw new SubscriptionAlreadyExistsError(command.orgId);
      }
      if (command.noOfSeats <= 0) {
        this.logger.warn('Invalid number of seats provided', {
          noOfSeats: command.noOfSeats,
        });
        throw new InvalidSubscriptionDataError(
          'Number of seats must be greater than 0',
        );
      }

      const [invites, users] = await Promise.all([
        this.getInvitesByOrgUseCase.execute(
          new GetInvitesByOrgQuery({
            orgId: command.orgId,
            requestingUserId: command.requestingUserId,
            onlyOpen: true,
          }),
        ),
        this.findUsersByOrgIdUseCase.execute(
          new FindUsersByOrgIdQuery(command.orgId),
        ),
      ]);
      if (invites.length + users.length > command.noOfSeats) {
        this.logger.warn('Too many used seats', {
          orgId: command.orgId,
          openInvites: invites.length,
        });
        throw new TooManyUsedSeatsError({
          orgId: command.orgId,
          openInvites: invites.length,
        });
      }

      const pricePerSeat = this.configService.get<number>(
        'subscriptions.pricePerSeatYearly',
      );

      if (!pricePerSeat) {
        this.logger.error('Price per seat not configured', {});
        throw new InvalidSubscriptionDataError('Price per seat not configured');
      }

      this.logger.debug('Creating subscription entity');
      const subscription = new Subscription({
        orgId: command.orgId,
        noOfSeats: command.noOfSeats,
        renewalCycle: RenewalCycle.YEARLY,
        pricePerSeat,
        renewalCycleAnchor: new Date(),
        billingInfo: new SubscriptionBillingInfo({
          companyName: command.companyName,
          subText: command.subText,
          street: command.street,
          houseNumber: command.houseNumber,
          postalCode: command.postalCode,
          city: command.city,
          country: command.country,
          vatNumber: command.vatNumber,
        }),
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
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
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
}
