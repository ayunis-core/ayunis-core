import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { SkillTemplateInstallationService } from 'src/domain/skill-templates/application/services/skill-template-installation.service';

@Injectable()
export class SkillTemplateUserCreatedListener {
  private readonly logger = new Logger(SkillTemplateUserCreatedListener.name);

  constructor(
    private readonly skillTemplateInstallationService: SkillTemplateInstallationService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.log(
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

      this.logger.log(
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
