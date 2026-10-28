import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';

@Injectable()
export class CountKnowledgeBaseDocumentsUseCase {
  constructor(private readonly repository: KnowledgeBaseRepository) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: {
    knowledgeBaseIds: UUID[];
  }): Promise<Map<UUID, number>> {
    return this.repository.countSourcesByKnowledgeBaseIds(
      query.knowledgeBaseIds,
    );
  }
}
