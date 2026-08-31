import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

@Injectable()
export class ListKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListKnowledgeBasesUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: ListKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.log({ userId: query.userId }, 'Listing knowledge bases');

    return await this.knowledgeBaseRepository.findAllByUserId(query.userId);
  }
}
