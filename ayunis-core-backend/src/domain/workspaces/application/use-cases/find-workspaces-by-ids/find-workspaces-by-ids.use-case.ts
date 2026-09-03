import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { FindWorkspacesByIdsQuery } from './find-workspaces-by-ids.query';

@Injectable()
export class FindWorkspacesByIdsUseCase {
  private readonly logger = new Logger(FindWorkspacesByIdsUseCase.name);

  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: FindWorkspacesByIdsQuery): Promise<Workspace[]> {
    this.logger.debug(
      {
        userId: query.userId,
        count: query.ids.length,
      },
      'Finding workspaces by ids',
    );
    return this.workspacesRepository.findAllByIds(query.userId, query.ids);
  }
}
