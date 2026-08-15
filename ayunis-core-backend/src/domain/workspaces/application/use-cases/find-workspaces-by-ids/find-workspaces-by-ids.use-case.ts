import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Workspace } from '../../../domain/workspace.entity';
import { UnexpectedWorkspaceError } from '../../workspaces.errors';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import type { FindWorkspacesByIdsQuery } from './find-workspaces-by-ids.query';

@Injectable()
export class FindWorkspacesByIdsUseCase {
  constructor(
    @InjectPinoLogger(FindWorkspacesByIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
  ) {}

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
