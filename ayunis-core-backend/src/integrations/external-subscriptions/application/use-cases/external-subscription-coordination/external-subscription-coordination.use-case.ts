import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ExternalSubscriptionLease } from 'src/integrations/external-subscriptions/application/ports/external-subscription-lease';
import {
  ExternalSubscriptionDisabledError,
  UnexpectedExternalSubscriptionError,
} from 'src/integrations/external-subscriptions/application/external-subscription.errors';

type LeaseCommand = { ownerId: string; action: 'acquire' | 'release' };
@Injectable()
export class ExternalSubscriptionCoordinationUseCase {
  private readonly logger = new Logger(
    ExternalSubscriptionCoordinationUseCase.name,
  );
  constructor(
    private readonly config: ConfigService,
    private readonly lease: ExternalSubscriptionLease,
  ) {}
  @HandleUnexpectedErrors(UnexpectedExternalSubscriptionError)
  async execute(command: LeaseCommand): Promise<{ acquired: boolean }> {
    this.logger.log('Coordinating external subscription synchronization');
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.externalSubscriptionsEnabled')
    )
      throw new ExternalSubscriptionDisabledError();
    if (command.action === 'acquire')
      return { acquired: await this.lease.acquire(command.ownerId as UUID) };
    await this.lease.release(command.ownerId as UUID);
    return { acquired: false };
  }
}
