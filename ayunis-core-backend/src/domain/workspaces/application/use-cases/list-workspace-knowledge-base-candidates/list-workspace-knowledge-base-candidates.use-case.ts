import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { ListWorkspaceKnowledgeBaseCandidatesQuery } from './list-workspace-knowledge-base-candidates.query';

export interface WorkspaceKnowledgeBaseCandidate {
  knowledgeBase: KnowledgeBase;
  documentCount: number;
  isAttached: boolean;
}

@Injectable()
export class ListWorkspaceKnowledgeBaseCandidatesUseCase {
  constructor(
    @InjectPinoLogger(ListWorkspaceKnowledgeBaseCandidatesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceKnowledgeBaseCandidatesQuery,
  ): Promise<Paginated<WorkspaceKnowledgeBaseCandidate>> {
    this.logger.info(
      { workspaceId: query.workspaceId },
      'listWorkspaceKnowledgeBaseCandidates',
    );
    await this.accessService.requireRole(query.workspaceId, WorkspaceRole.EDIT);
    const [accessible, refs] = await Promise.all([
      this.knowledgeBaseAccessService.findAllAccessiblePaginated(undefined, {
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      }),
      this.workspacesRepository.getContextRefs(query.workspaceId),
    ]);
    const documentCounts =
      await this.knowledgeBaseAccessService.countSourcesByKnowledgeBaseIds(
        accessible.data.map(({ knowledgeBase }) => knowledgeBase.id),
      );
    const attachedIds = new Set(refs.knowledgeBases.map(({ id }) => id));
    return new Paginated({
      data: accessible.data.map(({ knowledgeBase }) => ({
        knowledgeBase,
        documentCount: documentCounts.get(knowledgeBase.id) ?? 0,
        isAttached: attachedIds.has(knowledgeBase.id),
      })),
      limit: accessible.limit,
      offset: accessible.offset,
      total: accessible.total,
    });
  }
}
