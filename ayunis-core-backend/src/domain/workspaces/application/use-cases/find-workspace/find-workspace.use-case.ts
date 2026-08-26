import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { FindWorkspaceQuery } from './find-workspace.query';

@Injectable()
export class FindWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(FindWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: FindWorkspaceQuery): Promise<Workspace> {
    this.logger.info({ workspaceId: query.id }, 'Finding workspace');
    const { workspace } = await this.accessService.requireAccessLevel(
      query.id,
      WorkspaceAccessLevel.USE,
    );
    return workspace;
  }
}
