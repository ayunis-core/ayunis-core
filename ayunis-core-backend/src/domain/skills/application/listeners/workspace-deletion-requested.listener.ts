import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SkillSourceCleanupService } from 'src/domain/skills/application/services/skill-source-cleanup.service';
import { GetSkillsByIdsQuery } from 'src/domain/skills/application/use-cases/get-skills-by-ids/get-skills-by-ids.query';
import { GetSkillsByIdsUseCase } from 'src/domain/skills/application/use-cases/get-skills-by-ids/get-skills-by-ids.use-case';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';

@Injectable()
export class SkillsWorkspaceDeletionRequestedListener {
  private readonly logger = new Logger(
    SkillsWorkspaceDeletionRequestedListener.name,
  );

  constructor(
    private readonly getSkillsByIdsUseCase: GetSkillsByIdsUseCase,
    private readonly sourceCleanup: SkillSourceCleanupService,
  ) {}

  @OnEvent(WorkspaceDeletionRequestedEvent.EVENT_NAME)
  async handle(event: WorkspaceDeletionRequestedEvent): Promise<void> {
    try {
      const skills = await this.getSkillsByIdsUseCase.execute(
        new GetSkillsByIdsQuery(event.skillIds),
      );
      await this.sourceCleanup.deferSourceCleanup(
        event,
        skills,
        event.orgId,
        'workspace',
      );
    } catch (error) {
      this.logger.error(
        { workspaceId: event.workspaceId, err: error as Error },
        'Failed to resolve skill sources for workspace deletion',
      );
    }
  }
}
