import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { FindWorkspaceKnowledgeBasePageUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-workspace-knowledge-base-page/find-workspace-knowledge-base-page.use-case';
import { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import type { WorkspaceKnowledgeBaseContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { ListWorkspaceKnowledgeBasesQuery } from './list-workspace-knowledge-bases.query';

@Injectable()
export class ListWorkspaceKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListWorkspaceKnowledgeBasesUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly findKnowledgeBasePage: FindWorkspaceKnowledgeBasePageUseCase,
    private readonly countDocuments: CountKnowledgeBaseDocumentsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceKnowledgeBasesQuery,
  ): Promise<Paginated<WorkspaceKnowledgeBaseContext>> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    this.logger.log(
      { workspaceId: query.workspaceId },
      'listWorkspaceKnowledgeBases',
    );
    const workspace = await this.workspacesRepository.findById(
      userId,
      query.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(query.workspaceId);

    const page = await this.findKnowledgeBasePage.execute(query);
    const counts = await this.countDocuments.execute({
      knowledgeBaseIds: page.data.map(({ knowledgeBase }) => knowledgeBase.id),
    });

    return new Paginated({
      data: page.data.map(({ knowledgeBase, isActive }) => ({
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        documentCount: counts.get(knowledgeBase.id) ?? 0,
        isActive,
      })),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }
}
