import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from '../../workspaces.errors';
import { ListWorkspaceKnowledgeBaseCandidatesQuery } from './list-workspace-knowledge-base-candidates.query';

export interface WorkspaceKnowledgeBaseCandidate {
  knowledgeBase: KnowledgeBase;
  documentCount: number;
  isAttached: boolean;
}

@Injectable()
export class ListWorkspaceKnowledgeBaseCandidatesUseCase {
  private readonly logger = new Logger(
    ListWorkspaceKnowledgeBaseCandidatesUseCase.name,
  );

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceKnowledgeBaseCandidatesQuery,
  ): Promise<WorkspaceKnowledgeBaseCandidate[]> {
    this.logger.log('listWorkspaceKnowledgeBaseCandidates', {
      workspaceId: query.workspaceId,
    });
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      query.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(query.workspaceId);

    const [accessible, refs] = await Promise.all([
      this.knowledgeBaseAccessService.findAllAccessible(),
      this.workspacesRepository.getContextRefs(query.workspaceId),
    ]);
    const knowledgeBases = accessible.map(({ knowledgeBase }) => knowledgeBase);
    const documentCounts =
      await this.knowledgeBaseAccessService.countSourcesByKnowledgeBaseIds(
        knowledgeBases.map((knowledgeBase) => knowledgeBase.id),
      );
    const attachedIds = new Set(refs.knowledgeBases.map(({ id }) => id));
    return knowledgeBases.map((knowledgeBase) => ({
      knowledgeBase,
      documentCount: documentCounts.get(knowledgeBase.id) ?? 0,
      isAttached: attachedIds.has(knowledgeBase.id),
    }));
  }
}
