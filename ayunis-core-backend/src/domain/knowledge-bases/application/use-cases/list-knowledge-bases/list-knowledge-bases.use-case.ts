import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';

@Injectable()
export class ListKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListKnowledgeBasesUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: ListKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.log('Listing knowledge bases', { userId: query.userId });

    return await this.knowledgeBaseRepository.findAllByUserId(query.userId);
  }
}
