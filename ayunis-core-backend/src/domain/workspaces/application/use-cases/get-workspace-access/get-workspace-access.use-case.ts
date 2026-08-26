import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WorkspaceAccessService,
  type ResolvedWorkspaceAccess,
} from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceAccessQuery } from './get-workspace-access.query';

@Injectable()
export class GetWorkspaceAccessUseCase {
  constructor(
    @InjectPinoLogger(GetWorkspaceAccessUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: GetWorkspaceAccessQuery,
  ): Promise<ResolvedWorkspaceAccess> {
    this.logger.info(
      {
        workspaceId: query.workspaceId,
        minimumAccessLevel: query.minimumAccessLevel,
      },
      'Getting workspace access',
    );
    return this.workspaceAccessService.requireAccessLevel(
      query.workspaceId,
      query.minimumAccessLevel,
    );
  }
}
