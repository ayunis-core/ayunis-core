import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { MarketplaceSkillInstallationService } from '../services/marketplace-skill-installation.service';

@Injectable()
export class UserCreatedListener {
  constructor(
    @InjectPinoLogger(UserCreatedListener.name)
    private readonly logger: PinoLogger,
    private readonly skillInstallationService: MarketplaceSkillInstallationService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.info(
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

      this.logger.info(
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
