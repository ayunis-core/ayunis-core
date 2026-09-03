import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { FindAllWorkspacesQuery } from './find-all-workspaces.query';

export interface WorkspaceListItem {
  workspace: Workspace;
  chatCount: number;
  /** Later of the workspace's own edit and its most recent chat activity. */
  lastActivityAt: Date;
}

@Injectable()
export class FindAllWorkspacesUseCase {
  private readonly logger = new Logger(FindAllWorkspacesUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: FindAllWorkspacesQuery = new FindAllWorkspacesQuery(),
  ): Promise<Paginated<WorkspaceListItem>> {
    this.logger.log('Finding all workspaces');

    const workspaces = await this.workspacesRepository.findAllByUserId(
      this.resolveUserId(),
      query,
    );
    const stats = await this.workspacesRepository.getThreadStats(
      workspaces.data.map((workspace) => workspace.id),
    );

    const data = workspaces.data.map((workspace) => {
      const threadStats = stats.get(workspace.id);
      const chatActivity = threadStats?.lastActivityAt;
      return {
        workspace,
        chatCount: threadStats?.chatCount ?? 0,
        lastActivityAt:
          chatActivity && chatActivity > workspace.updatedAt
            ? chatActivity
            : workspace.updatedAt,
      };
    });

    return new Paginated({
      data,
      limit: workspaces.limit,
      offset: workspaces.offset,
      total: workspaces.total,
    });
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
