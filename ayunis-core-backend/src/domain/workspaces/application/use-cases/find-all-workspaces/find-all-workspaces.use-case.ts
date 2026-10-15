import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import {
  WorkspaceSummaryService,
  type WorkspaceSummary,
} from 'src/domain/workspaces/application/services/workspace-summary.service';
import {
  WorkspacesRepository,
  type WorkspaceListStats,
} from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { FindAllWorkspacesQuery } from './find-all-workspaces.query';
import { getRequiredUserContext } from 'src/common/context/required-context';

export interface WorkspaceListItem extends WorkspaceSummary {
  workspace: Workspace;
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
    private readonly contextService: ContextService,
    private readonly summaries: WorkspaceSummaryService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: FindAllWorkspacesQuery = new FindAllWorkspacesQuery(),
  ): Promise<Paginated<WorkspaceListItem>> {
    this.logger.log('Finding all workspaces');

    const principal = getRequiredUserContext(this.contextService);
    const workspaces = await this.workspacesRepository.findAllAccessible(
      principal,
      query,
    );
    const [stats, summaries] = await Promise.all([
      this.workspacesRepository.getListStats(
        workspaces.data.map((workspace) => workspace.id),
        principal.userId,
      ),
      this.summaries.summarize(workspaces.data),
    ]);

    const data = workspaces.data.map((workspace) =>
      toListItem(
        workspace,
        stats.get(workspace.id),
        summaries.get(workspace.id),
      ),
    );

    return new Paginated({
      data,
      limit: workspaces.limit,
      offset: workspaces.offset,
      total: workspaces.total,
    });
  }
}

const NO_STATS: WorkspaceListStats = {
  chatCount: 0,
  lastActivityAt: null,
  skillCount: 0,
  knowledgeBaseCount: 0,
};

const OWNER_ONLY: WorkspaceSummary = { accessLevel: 'use', memberCount: 1 };

function toListItem(
  workspace: Workspace,
  stats: WorkspaceListStats | undefined,
  summary: WorkspaceSummary | undefined,
): WorkspaceListItem {
  const { chatCount, skillCount, knowledgeBaseCount, lastActivityAt } =
    stats ?? NO_STATS;
  return {
    workspace,
    ...(summary ?? OWNER_ONLY),
    chatCount,
    skillCount,
    knowledgeBaseCount,
    lastActivityAt:
      lastActivityAt && lastActivityAt > workspace.updatedAt
        ? lastActivityAt
        : workspace.updatedAt,
  };
}
