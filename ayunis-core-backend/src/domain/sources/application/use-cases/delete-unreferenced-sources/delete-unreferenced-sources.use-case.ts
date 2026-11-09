import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { FindUnreferencedSourceIdsQuery } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.query';
import { FindUnreferencedSourceIdsUseCase } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.use-case';
import { DeleteUnreferencedSourcesCommand } from './delete-unreferenced-sources.command';

/**
 * Sources carry no owner foreign key, so when a thread or skill row is removed
 * by a cascade its sources, their indexes and their retained originals stay
 * behind. Callers pass the source ids they resolved before the cascade; only
 * those no skill, knowledge base or thread still references are deleted. A
 * shared skill's source rows also sit in other users' threads, which the
 * owner's deletion must leave intact.
 */
@Injectable()
export class DeleteUnreferencedSourcesUseCase {
  private readonly logger = new Logger(DeleteUnreferencedSourcesUseCase.name);

  constructor(
    private readonly findUnreferencedSourceIdsUseCase: FindUnreferencedSourceIdsUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: DeleteUnreferencedSourcesCommand): Promise<UUID[]> {
    this.logger.log(
      { candidateCount: command.sourceIds.length },
      'Deleting unreferenced sources',
    );
    if (command.sourceIds.length === 0) return [];

    const sourceIds = await this.findUnreferencedSourceIdsUseCase.execute(
      new FindUnreferencedSourceIdsQuery(command.sourceIds, new Date()),
    );
    if (sourceIds.length > 0) {
      await this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(sourceIds, command.orgId),
      );
    }
    return sourceIds;
  }
}
