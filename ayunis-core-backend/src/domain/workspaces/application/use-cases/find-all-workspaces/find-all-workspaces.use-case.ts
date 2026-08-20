import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { FindAllWorkspacesQuery } from './find-all-workspaces.query';

export interface WorkspaceListItem {
  workspace: Workspace;
  role: WorkspaceRole;
  isOwner: boolean;
  chatCount: number;
  lastActivityAt: Date;
}

@Injectable()
export class FindAllWorkspacesUseCase {
  constructor(
    @InjectPinoLogger(FindAllWorkspacesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: FindAllWorkspacesQuery = new FindAllWorkspacesQuery(),
  ): Promise<Paginated<WorkspaceListItem>> {
    this.logger.info('Finding all accessible workspaces');
    const page = await this.accessService.findAllAccessible(query);
    const stats = await this.workspacesRepository.getThreadStats(
      page.data.map(({ workspace }) => workspace.id),
    );
    return new Paginated({
      data: page.data.map(({ workspace, role, sources }) => {
        const threadStats = stats.get(workspace.id);
        const chatActivity = threadStats?.lastActivityAt;
        return {
          workspace,
          role,
          isOwner: sources.some(({ type }) => type === 'owner'),
          chatCount: threadStats?.chatCount ?? 0,
          lastActivityAt:
            chatActivity && chatActivity > workspace.updatedAt
              ? chatActivity
              : workspace.updatedAt,
        };
      }),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }
}
