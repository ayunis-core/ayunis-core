import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import type { WorkspaceKnowledgeBaseContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { ListWorkspaceKnowledgeBasesQuery } from './list-workspace-knowledge-bases.query';

@Injectable()
export class ListWorkspaceKnowledgeBasesUseCase {
  constructor(
    @InjectPinoLogger(ListWorkspaceKnowledgeBasesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceKnowledgeBasesQuery,
  ): Promise<Paginated<WorkspaceKnowledgeBaseContext>> {
    this.logger.info(
      { workspaceId: query.workspaceId },
      'listWorkspaceKnowledgeBases',
    );
    await this.accessService.requireRole(query.workspaceId, WorkspaceRole.USE);
    const page =
      await this.knowledgeBaseAccessService.findAllAccessiblePaginated(
        query.workspaceId,
        {
          search: query.search,
          limit: query.limit,
          offset: query.offset,
        },
      );
    const counts =
      await this.knowledgeBaseAccessService.countSourcesByKnowledgeBaseIds(
        page.data.map(({ knowledgeBase }) => knowledgeBase.id),
      );

    return new Paginated({
      data: page.data.map(({ knowledgeBase }) => ({
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        documentCount: counts.get(knowledgeBase.id) ?? 0,
      })),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }
}
