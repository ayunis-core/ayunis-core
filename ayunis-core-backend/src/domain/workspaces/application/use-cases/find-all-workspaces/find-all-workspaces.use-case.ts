import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import {
  WorkspacesRepository,
  type WorkspaceListStats,
} from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { WorkspaceAccess } from 'src/domain/workspaces/application/models/workspace-access.model';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { FindAllWorkspacesQuery } from './find-all-workspaces.query';
import { getRequiredUserContext } from 'src/common/context/required-context';

export interface WorkspaceListItem {
  workspace: Workspace;
  access: WorkspaceAccess;
  chatCount: number;
  skillCount: number;
  knowledgeBaseCount: number;
  /** Later of the workspace's own edit and its most recent chat activity. */
  lastActivityAt: Date;
}

@Injectable()
export class FindAllWorkspacesUseCase {
  private readonly logger = new Logger(FindAllWorkspacesUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: FindAllWorkspacesQuery = new FindAllWorkspacesQuery(),
  ): Promise<Paginated<WorkspaceListItem>> {
    this.logger.log('Finding all workspaces');

    const userId = this.resolveUserId();
    const workspaces = await this.workspacesRepository.findAllByUserId(
      userId,
      query,
    );
    const workspaceIds = workspaces.data.map((workspace) => workspace.id);
    const [stats, accesses] = await Promise.all([
      this.workspacesRepository.getListStats(userId, workspaceIds),
      this.workspaceAccess.forWorkspaces(workspaceIds),
    ]);

    const data = workspaces.data.flatMap((workspace) => {
      const access = accesses.get(workspace.id);
      // Membership can end between the two reads.
      if (!access) return [];
      return [this.toListItem(workspace, access, stats.get(workspace.id))];
    });

    return new Paginated({
      data,
      limit: workspaces.limit,
      offset: workspaces.offset,
      total: workspaces.total,
    });
  }

  private toListItem(
    workspace: Workspace,
    access: WorkspaceAccess,
    stats: WorkspaceListStats | undefined,
  ): WorkspaceListItem {
    const chatActivity = stats?.lastActivityAt;
    return {
      workspace,
      access,
      chatCount: stats?.chatCount ?? 0,
      skillCount: stats?.skillCount ?? 0,
      knowledgeBaseCount: stats?.knowledgeBaseCount ?? 0,
      lastActivityAt:
        chatActivity && chatActivity > workspace.updatedAt
          ? chatActivity
          : workspace.updatedAt,
    };
  }

  private resolveUserId(): UUID {
    const { userId } = getRequiredUserContext(this.contextService);
    return userId;
  }
}
