import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import type { FindWorkspacesByIdsQuery } from './find-workspaces-by-ids.query';

@Injectable()
export class FindWorkspacesByIdsUseCase {
  constructor(
    @InjectPinoLogger(FindWorkspacesByIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: FindWorkspacesByIdsQuery): Promise<Workspace[]> {
    this.logger.debug({ count: query.ids.length }, 'Finding workspaces by ids');
    const accesses = await this.accessService.findAllAccessibleByIds(query.ids);
    return accesses.map(({ workspace }) => workspace);
  }
}
