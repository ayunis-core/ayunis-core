import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SubscriptionSyncLinkRepository } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-link.repository';
import {
  SubscriptionSyncDisabledError,
  UnexpectedSubscriptionSyncError,
} from 'src/integrations/core-connect/subscription-sync/application/subscription-sync.errors';
@Injectable()
export class ListSubscriptionSyncLinksUseCase {
  private readonly logger = new Logger(ListSubscriptionSyncLinksUseCase.name);
  constructor(
    private readonly config: ConfigService,
    private readonly links: SubscriptionSyncLinkRepository,
  ) {}
  @HandleUnexpectedErrors(UnexpectedSubscriptionSyncError)
  async execute(command: { ownerId?: string } = {}) {
    this.logger.log('Listing external subscription ownership');
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.externalSubscriptionsEnabled')
    )
      throw new SubscriptionSyncDisabledError();
    return this.links.findAll(command.ownerId);
  }
}
