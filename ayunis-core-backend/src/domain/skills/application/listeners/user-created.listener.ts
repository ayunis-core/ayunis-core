import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { MarketplaceSkillInstallationService } from '../services/marketplace-skill-installation.service';

@Injectable()
export class UserCreatedListener {
  private readonly logger = new Logger(UserCreatedListener.name);

  constructor(
    private readonly skillInstallationService: MarketplaceSkillInstallationService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.log('Installing pre-installed skills for new user', {
        userId: event.userId,
        orgId: event.orgId,
      });

      const successCount =
        await this.skillInstallationService.installAllPreInstalled(
          event.userId,
        );

      this.logger.log('Pre-installed skills installation complete', {
        userId: event.userId,
        count: successCount,
      });
    } catch (error) {
      this.logger.error('Failed to install pre-installed skills', {
        userId: event.userId,
        orgId: event.orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
