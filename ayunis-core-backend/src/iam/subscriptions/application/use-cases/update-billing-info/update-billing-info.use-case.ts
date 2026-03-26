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
import { SendWebhookCommand } from 'src/integrations/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SubscriptionBillingInfoUpdatedWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-billing-info-updated.webhook-event';
import { SendWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import type { BillingInfoPayload } from 'src/integrations/webhooks/domain/subscription-webhook-payload.types';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class UpdateBillingInfoUseCase {
  private readonly logger = new Logger(UpdateBillingInfoUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateBillingInfoCommand): Promise<void> {
    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );
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

      const billingInfoPayload: BillingInfoPayload = {
        companyName: billingInfo.companyName,
        street: billingInfo.street,
        houseNumber: billingInfo.houseNumber,
        postalCode: billingInfo.postalCode,
        city: billingInfo.city,
        country: billingInfo.country,
        vatNumber: billingInfo.vatNumber,
        subText: billingInfo.subText,
        orgId: command.orgId,
        subscriptionId: subscription.subscription.id,
      };

      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(
          new SubscriptionBillingInfoUpdatedWebhookEvent(billingInfoPayload),
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
