import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HasActiveSubscriptionQuery } from './has-active-subscription.query';
import { HasActiveSubscriptionResult } from './has-active-subscription.result';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { ConfigService } from '@nestjs/config';
import { isActive } from '../../util/is-active';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class HasActiveSubscriptionUseCase {
  constructor(
    @InjectPinoLogger(HasActiveSubscriptionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    query: HasActiveSubscriptionQuery,
  ): Promise<HasActiveSubscriptionResult> {
    // Self-hosted instances are not required to have an active subscription
    // This is used in the subscription guard to allow access to the subscription endpoint
    // And as a separate endpoint for the frontend to display "get a subscription" hints
    const isSelfHosted = this.configService.get<boolean>('app.isSelfHosted');
    if (isSelfHosted) {
      return { hasActiveSubscription: true, subscriptionType: null };
    }

    this.logger.info(
      {
        orgId: query.orgId,
      },
      'Checking active subscription',
    );

    try {
      this.logger.debug('Finding subscription');
      const subscriptions = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      if (subscriptions.length === 0) {
        this.logger.debug(
          {
            orgId: query.orgId,
          },
          'No subscription found for organization',
        );
        return { hasActiveSubscription: false, subscriptionType: null };
      }

      for (const subscription of subscriptions) {
        if (!isActive(subscription)) continue;
        if (query.type && subscription.type !== query.type) continue;
        return {
          hasActiveSubscription: true,
          subscriptionType: subscription.type,
        };
      }

      return { hasActiveSubscription: false, subscriptionType: null };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        { err: error as Error, orgId: query.orgId },
        'Checking active subscription failed',
      );
      throw error;
    }
  }
}
