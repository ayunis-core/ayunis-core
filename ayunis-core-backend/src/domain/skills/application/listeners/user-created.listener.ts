import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { MarketplaceSkillInstallationService } from 'src/domain/skills/application/services/marketplace-skill-installation.service';

@Injectable()
export class UserCreatedListener {
  private readonly logger = new Logger(UserCreatedListener.name);

  constructor(
    private readonly skillInstallationService: MarketplaceSkillInstallationService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.log(
        {
          userId: event.userId,
          orgId: event.orgId,
        },
        'Installing pre-installed skills for new user',
      );

      const successCount =
        await this.skillInstallationService.installAllPreInstalled(
          event.userId,
        );

      this.logger.log(
        {
          userId: event.userId,
          count: successCount,
        },
        'Pre-installed skills installation complete',
      );
    } catch (error) {
      this.logger.error(
        {
          userId: event.userId,
          orgId: event.orgId,
          err: error as Error,
        },
        'Failed to install pre-installed skills',
      );
    }
  }
}
