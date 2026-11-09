import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { DeferredCleanupEvent } from 'src/common/events/deferred-cleanup.event';
import type { Skill } from 'src/domain/skills/domain/skill';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

/**
 * Skill sources are linked through a join table, so cascading skill deletes
 * leave them behind. Owner-deletion listeners register their removal here.
 */
@Injectable()
export class SkillSourceCleanupService {
  constructor(
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
    private readonly cleanupSourceProcessingUseCase: CleanupSourceProcessingUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  async deferSourceCleanup(
    event: DeferredCleanupEvent,
    skills: Skill[],
    orgId: UUID,
    owner: string,
  ): Promise<void> {
    const sourceIds = [...new Set(skills.flatMap((skill) => skill.sourceIds))];
    if (sourceIds.length === 0) return;

    const sources = await this.getSourcesByIdsUseCase.execute(
      new GetSourcesByIdsQuery(sourceIds),
    );
    const processingSourceIds = sources
      .filter((source) => source.status === SourceStatus.PROCESSING)
      .map((source) => source.id);

    if (processingSourceIds.length > 0) {
      event.deferCleanup(`cleanup ${owner} skill source processing`, () =>
        this.cleanupSourceProcessingUseCase.execute(
          new CleanupSourceProcessingCommand(processingSourceIds, orgId),
        ),
      );
    }
    event.deferCleanup(`delete ${owner} skill sources`, () =>
      this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(sourceIds, orgId),
      ),
    );
  }
}
