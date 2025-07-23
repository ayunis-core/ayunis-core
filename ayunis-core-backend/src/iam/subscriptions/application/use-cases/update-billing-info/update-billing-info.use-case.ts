import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { GetActiveSubscriptionQuery } from '../get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import { UpdateBillingInfoCommand } from './update-billing-info.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { Injectable, Logger } from '@nestjs/common';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SubscriptionBillingInfoUpdatedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/subscription-billing-info-updated.webhook-event';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';

@Injectable()
export class UpdateBillingInfoUseCase {
  private readonly logger = new Logger(UpdateBillingInfoUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
  ) {}

  async execute(command: UpdateBillingInfoCommand): Promise<void> {
    try {
      const subscription = await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
        }),
      );

      if (!subscription) {
        throw new SubscriptionNotFoundError(command.orgId);
      }

      const billingInfo = new SubscriptionBillingInfo({
        ...subscription.subscription.billingInfo,
        ...command.billingInfo,
      });

      await this.subscriptionRepository.updateBillingInfo(
        subscription.subscription.id,
        billingInfo,
      );

      subscription.subscription.billingInfo = billingInfo;

      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(
          new SubscriptionBillingInfoUpdatedWebhookEvent(
            subscription.subscription,
          ),
        ),
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(error);
      throw new UnexpectedSubscriptionError((error as Error).message, {
        error: error as Error,
      });
    }
  }
}
