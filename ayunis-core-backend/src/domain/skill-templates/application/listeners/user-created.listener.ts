import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { SkillTemplateInstallationService } from '../services/skill-template-installation.service';

@Injectable()
export class SkillTemplateUserCreatedListener {
  private readonly logger = new Logger(SkillTemplateUserCreatedListener.name);

  constructor(
    private readonly skillTemplateInstallationService: SkillTemplateInstallationService,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.log('Installing pre-created skill templates for new user', {
        userId: event.userId,
        orgId: event.orgId,
      });

      const successCount =
        await this.skillTemplateInstallationService.installAllPreCreatedForUser(
          event.userId,
        );

      this.logger.log('Pre-created skill template installation complete', {
        userId: event.userId,
        count: successCount,
      });
    } catch (error) {
      this.logger.error('Failed to install pre-created skill templates', {
        userId: event.userId,
        orgId: event.orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
