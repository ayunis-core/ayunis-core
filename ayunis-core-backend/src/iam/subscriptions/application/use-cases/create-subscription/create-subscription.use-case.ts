import { Injectable, Logger } from '@nestjs/common';
import { CreateSubscriptionCommand } from './create-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { ConfigService } from '@nestjs/config';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import {
  SubscriptionAlreadyExistsError,
  InvalidSubscriptionDataError,
  UnexpectedSubscriptionError,
  TooManyUsedSeatsError,
} from '../../subscription.errors';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { HasActiveSubscriptionQuery } from '../has-active-subscription/has-active-subscription.query';
import { HasActiveSubscriptionUseCase } from '../has-active-subscription/has-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import type { User } from 'src/iam/users/domain/user.entity';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { SendWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from 'src/integrations/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SubscriptionCreatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-created.webhook-events';
import { toSubscriptionWebhookPayload } from '../../mappers/subscription-webhook-payload.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class CreateSubscriptionUseCase {
  private readonly logger = new Logger(CreateSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly configService: ConfigService,
    private readonly hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreateSubscriptionCommand): Promise<Subscription> {
    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );

      await this.ensureNoActiveSubscription(command.orgId);

      const subscription =
        command.type === SubscriptionType.USAGE_BASED
          ? this.createUsageBasedSubscription(command)
          : await this.createSeatBasedSubscription(command);

      const createdSubscription =
        await this.subscriptionRepository.create(subscription);

      this.logger.debug('Subscription created successfully', {
        subscriptionId: createdSubscription.id,
        orgId: command.orgId,
        type: command.type,
      });

      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(
          new SubscriptionCreatedWebhookEvent(
            toSubscriptionWebhookPayload(createdSubscription),
          ),
        ),
      );

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

  private async ensureNoActiveSubscription(
    orgId: Subscription['orgId'],
  ): Promise<void> {
    const { hasActiveSubscription } =
      await this.hasActiveSubscriptionUseCase.execute(
        new HasActiveSubscriptionQuery(orgId),
      );
    if (hasActiveSubscription) {
      this.logger.warn('Subscription already exists for organization', {
        orgId,
      });
      throw new SubscriptionAlreadyExistsError(orgId);
    }
  }

  private createUsageBasedSubscription(
    command: CreateSubscriptionCommand,
  ): UsageBasedSubscription {
    if (!command.monthlyCredits || command.monthlyCredits <= 0) {
      throw new InvalidSubscriptionDataError(
        'Monthly credits must be greater than 0 for usage-based subscriptions',
      );
    }

    this.logger.log('Creating usage-based subscription', {
      orgId: command.orgId,
      monthlyCredits: command.monthlyCredits,
    });

    return new UsageBasedSubscription({
      orgId: command.orgId,
      monthlyCredits: command.monthlyCredits,
      billingInfo: this.buildBillingInfo(command),
    });
  }

  private async createSeatBasedSubscription(
    command: CreateSubscriptionCommand,
  ): Promise<SeatBasedSubscription> {
    const noOfSeats = command.noOfSeats ?? 1;

    this.logger.log('Creating seat-based subscription', {
      orgId: command.orgId,
      noOfSeats,
    });

    if (noOfSeats <= 0) {
      throw new InvalidSubscriptionDataError(
        'Number of seats must be greater than 0',
      );
    }

    await this.validateSeatCount(
      command.orgId,
      command.requestingUserId,
      noOfSeats,
    );

    const pricePerSeat = this.configService.get<number>(
      'subscriptions.pricePerSeatYearly',
    );
    if (!pricePerSeat) {
      throw new InvalidSubscriptionDataError('Price per seat not configured');
    }

    return new SeatBasedSubscription({
      orgId: command.orgId,
      noOfSeats,
      renewalCycle: RenewalCycle.YEARLY,
      pricePerSeat,
      renewalCycleAnchor: new Date(),
      billingInfo: this.buildBillingInfo(command),
    });
  }

  private async validateSeatCount(
    orgId: Subscription['orgId'],
    requestingUserId: User['id'],
    noOfSeats: number,
  ): Promise<void> {
    const [invitesResult, usersResult] = await Promise.all([
      this.getInvitesByOrgUseCase.execute(
        new GetInvitesByOrgQuery({
          orgId,
          requestingUserId,
          onlyOpen: true,
        }),
      ),
      this.findUsersByOrgIdUseCase.execute(
        new FindUsersByOrgIdQuery({
          orgId,
          pagination: { limit: 1000, offset: 0 },
        }),
      ),
    ]);
    const openInvitesCount = invitesResult.total ?? invitesResult.data.length;
    if (
      openInvitesCount + (usersResult.total ?? usersResult.data.length) >
      noOfSeats
    ) {
      this.logger.warn('Too many used seats', {
        orgId,
        openInvites: openInvitesCount,
      });
      throw new TooManyUsedSeatsError({
        orgId,
        openInvites: openInvitesCount,
      });
    }
  }

  private buildBillingInfo(
    command: CreateSubscriptionCommand,
  ): SubscriptionBillingInfo {
    return new SubscriptionBillingInfo({
      companyName: command.companyName,
      subText: command.subText,
      street: command.street,
      houseNumber: command.houseNumber,
      postalCode: command.postalCode,
      city: command.city,
      country: command.country,
      vatNumber: command.vatNumber,
    });
  }
}
