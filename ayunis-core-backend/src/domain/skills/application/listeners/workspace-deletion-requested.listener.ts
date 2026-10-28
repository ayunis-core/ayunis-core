import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GetSkillsByIdsQuery } from 'src/domain/skills/application/use-cases/get-skills-by-ids/get-skills-by-ids.query';
import { GetSkillsByIdsUseCase } from 'src/domain/skills/application/use-cases/get-skills-by-ids/get-skills-by-ids.use-case';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { WorkspaceDeletionRequestedEvent } from 'src/domain/workspaces/application/events/workspace-deletion-requested.event';

@Injectable()
export class SkillsWorkspaceDeletionRequestedListener {
  private readonly logger = new Logger(
    SkillsWorkspaceDeletionRequestedListener.name,
  );

  constructor(
    private readonly getSkillsByIdsUseCase: GetSkillsByIdsUseCase,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  @OnEvent(WorkspaceDeletionRequestedEvent.EVENT_NAME)
  async handle(event: WorkspaceDeletionRequestedEvent): Promise<void> {
    try {
      const skills = await this.getSkillsByIdsUseCase.execute(
        new GetSkillsByIdsQuery(event.skillIds),
      );
      const sourceIds = [
        ...new Set(skills.flatMap((skill) => skill.sourceIds)),
      ];
      if (sourceIds.length === 0) return;

      const sources = await this.getSourcesByIdsUseCase.execute(
        new GetSourcesByIdsQuery(sourceIds),
      );
      const processingSourceIds = sources
        .filter((source) => source.status === SourceStatus.PROCESSING)
        .map((source) => source.id);

      if (processingSourceIds.length > 0) {
        event.deferCleanup('cleanup workspace skill source processing', () =>
          this.cleanupSourceProcessingUseCase.execute(
            new CleanupSourceProcessingCommand(
              processingSourceIds,
              event.orgId,
            ),
          ),
        );
      }
      event.deferCleanup('delete workspace skill sources', () =>
        this.deleteSourcesUseCase.execute(
          new DeleteSourcesCommand(sourceIds, event.orgId),
        ),
      );
    } catch (error) {
      this.logger.error(
        { workspaceId: event.workspaceId, err: error as Error },
        'Failed to resolve skill sources for workspace deletion',
      );
    }
  }
}
