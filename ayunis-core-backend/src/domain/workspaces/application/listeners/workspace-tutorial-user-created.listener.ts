import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { featuresConfig } from 'src/config/features.config';
import { WorkspaceTutorialProvisioningService } from 'src/domain/workspaces/application/services/workspace-tutorial-provisioning.service';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';

@Injectable()
export class WorkspaceTutorialUserCreatedListener {
  private readonly logger = new Logger(
    WorkspaceTutorialUserCreatedListener.name,
  );

  constructor(
    private readonly provisioning: WorkspaceTutorialProvisioningService,
    @Inject(featuresConfig.KEY)
    private readonly features: ConfigType<typeof featuresConfig>,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    if (!this.features.workspacesEnabled) return;
    const identity = { userId: event.userId, orgId: event.orgId };
    try {
      this.logger.log(identity, 'Provisioning workspace tutorial for new user');
      await this.provisioning.provisionFor(event.userId, event.orgId);
    } catch (error) {
      this.logger.error(
        { ...identity, err: error },
        'Failed to provision workspace tutorial',
      );
    }
  }
}
