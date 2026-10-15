import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';

@Injectable()
export class GetLinkedWorkspaceKnowledgeBasesUseCase {
  private readonly logger = new Logger(
    GetLinkedWorkspaceKnowledgeBasesUseCase.name,
  );

  constructor(
    private readonly links: WorkspaceKnowledgeBaseLinkRepository,
    private readonly repository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: { workspaceId: UUID }): Promise<KnowledgeBase[]> {
    this.logger.log(query, 'Getting linked workspace knowledge bases');
    const links = await this.links.findByWorkspace(query.workspaceId);
    const knowledgeBases = await this.repository.findByIds(
      links.map(({ knowledgeBaseId }) => knowledgeBaseId),
    );
    return knowledgeBases.sort((a, b) => a.name.localeCompare(b.name));
  }
}
