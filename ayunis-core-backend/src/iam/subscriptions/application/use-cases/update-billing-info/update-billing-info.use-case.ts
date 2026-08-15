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
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionBillingInfoUpdatedEvent } from '../../events/subscription-billing-info-updated.event';
import type { BillingInfoEventData } from '../../events/subscription-event-data.types';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class UpdateBillingInfoUseCase {
  constructor(
    @InjectPinoLogger(UpdateBillingInfoUseCase.name)
    private readonly logger: PinoLogger,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly eventEmitter: EventEmitter2,
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

      // Cross-module runtime boundaries are guarded even when their types are non-null.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

      this.emitBillingInfoUpdated(
        command,
        subscription.subscription.id,
        billingInfo,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error });
      throw new UnexpectedSubscriptionError((error as Error).message, {
        error: error as Error,
      });
    }
  }

  private emitBillingInfoUpdated(
    command: UpdateBillingInfoCommand,
    subscriptionId: BillingInfoEventData['subscriptionId'],
    billingInfo: SubscriptionBillingInfo,
  ): void {
    const eventData: BillingInfoEventData = {
      companyName: billingInfo.companyName,
      street: billingInfo.street,
      houseNumber: billingInfo.houseNumber,
      postalCode: billingInfo.postalCode,
      city: billingInfo.city,
      country: billingInfo.country,
      vatNumber: billingInfo.vatNumber,
      subText: billingInfo.subText,
      orgId: command.orgId,
      subscriptionId,
    };
    this.eventEmitter
      .emitAsync(
        SubscriptionBillingInfoUpdatedEvent.EVENT_NAME,
        new SubscriptionBillingInfoUpdatedEvent(command.orgId, eventData),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, orgId: command.orgId },
          'Failed to emit SubscriptionBillingInfoUpdatedEvent',
        );
      });
  }
}
