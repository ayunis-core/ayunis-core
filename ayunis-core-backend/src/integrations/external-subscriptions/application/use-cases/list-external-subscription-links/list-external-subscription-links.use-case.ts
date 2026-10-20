import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ExternalSubscriptionLinkRepository } from 'src/integrations/external-subscriptions/application/ports/external-subscription-link.repository';
import {
  ExternalSubscriptionDisabledError,
  UnexpectedExternalSubscriptionError,
} from 'src/integrations/external-subscriptions/application/external-subscription.errors';
@Injectable()
export class ListExternalSubscriptionLinksUseCase {
  private readonly logger = new Logger(
    ListExternalSubscriptionLinksUseCase.name,
  );
  constructor(
    private readonly config: ConfigService,
    private readonly links: ExternalSubscriptionLinkRepository,
  ) {}
  @HandleUnexpectedErrors(UnexpectedExternalSubscriptionError)
  async execute(command: { ownerId?: string } = {}) {
    this.logger.log('Listing external subscription ownership');
    if (
      !this.config.get<boolean>('app.isCloudHosted') ||
      !this.config.get<boolean>('features.externalSubscriptionsEnabled')
    )
      throw new ExternalSubscriptionDisabledError();
    return this.links.findAll(command.ownerId);
  }
}
