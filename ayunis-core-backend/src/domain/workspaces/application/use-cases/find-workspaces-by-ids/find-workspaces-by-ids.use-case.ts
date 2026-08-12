import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Workspace } from '../../../domain/workspace.entity';
import { UnexpectedWorkspaceError } from '../../workspaces.errors';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import type { FindWorkspacesByIdsQuery } from './find-workspaces-by-ids.query';

@Injectable()
export class FindWorkspacesByIdsUseCase {
  private readonly logger = new Logger(FindWorkspacesByIdsUseCase.name);

  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: FindWorkspacesByIdsQuery): Promise<Workspace[]> {
    this.logger.debug('Finding workspaces by ids', {
      userId: query.userId,
      count: query.ids.length,
    });
    return this.workspacesRepository.findAllByIds(query.userId, query.ids);
  }
}
