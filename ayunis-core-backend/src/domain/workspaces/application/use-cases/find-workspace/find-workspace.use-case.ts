import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import type { AccessibleWorkspace } from 'src/domain/workspaces/application/models/workspace-access.model';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { FindWorkspaceQuery } from './find-workspace.query';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindWorkspaceUseCase {
  private readonly logger = new Logger(FindWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: FindWorkspaceQuery): Promise<AccessibleWorkspace> {
    this.logger.log({ workspaceId: query.id }, 'Finding workspace');

    const access = await this.workspaceAccess.requireMember(query.id);
    const { userId } = getRequiredUserContext(this.contextService);
    const workspace = await this.workspacesRepository.findById(
      userId,
      query.id,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError(query.id);
    }
    return { workspace, access };
  }
}
