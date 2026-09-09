import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';

@Injectable()
export class FindWorkspaceKnowledgeBasePageUseCase {
  constructor(private readonly knowledgeBases: KnowledgeBaseAccessService) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    workspaceId: UUID;
    search?: string;
    limit: number;
    offset: number;
  }) {
    const { workspaceId, ...options } = query;
    return this.knowledgeBases.findAllAccessiblePaginated(workspaceId, options);
  }
}
