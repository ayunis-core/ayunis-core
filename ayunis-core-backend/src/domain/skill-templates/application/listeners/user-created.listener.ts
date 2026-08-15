import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { SkillTemplateInstallationService } from '../services/skill-template-installation.service';

@Injectable()
export class SkillTemplateUserCreatedListener {
  constructor(
    @InjectPinoLogger(SkillTemplateUserCreatedListener.name)
    private readonly logger: PinoLogger,
    private readonly skillTemplateInstallationService: SkillTemplateInstallationService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.info(
        {
          userId: event.userId,
          orgId: event.orgId,
        },
        'Installing pre-created skill templates for new user',
      );

      const successCount =
        await this.skillTemplateInstallationService.installAllPreCreatedForUser(
          event.userId,
        );

      this.logger.info(
        {
          userId: event.userId,
          count: successCount,
        },
        'Pre-created skill template installation complete',
      );
    } catch (error) {
      this.logger.error(
        {
          userId: event.userId,
          orgId: event.orgId,
          err: error as Error,
        },
        'Failed to install pre-created skill templates',
      );
    }
  }
}
