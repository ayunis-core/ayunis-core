import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  UnauthorizedSubscriptionAccessError,
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
import { ContextService } from 'src/common/context/services/context.service';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@Injectable()
export class UpdateBillingInfoUseCase {
  private readonly logger = new Logger(UpdateBillingInfoUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly contextService: ContextService,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
  ) {}

  async execute(command: UpdateBillingInfoCommand): Promise<void> {
    try {
      const systemRole = this.contextService.get('systemRole');
      const orgRole = this.contextService.get('role');
      const isFromOrg = await this.isFromOrgUseCase.execute(
        new IsFromOrgQuery({
          userId: command.requestingUserId,
          orgId: command.orgId,
        }),
      );
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isOrgAdmin = orgRole === UserRole.ADMIN && isFromOrg;
      if (!isSuperAdmin && !isOrgAdmin) {
        throw new UnauthorizedSubscriptionAccessError(
          command.requestingUserId,
          command.orgId,
        );
      }
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
