import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';

@Injectable()
export class FindKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: FindKnowledgeBaseQuery): Promise<KnowledgeBase> {
    this.logger.log('Finding knowledge base', {
      id: query.id,
      userId: query.userId,
    });

    const knowledgeBase = await this.knowledgeBaseRepository.findById(query.id);
    if (knowledgeBase?.userId !== query.userId) {
      throw new KnowledgeBaseNotFoundError(query.id);
    }

    return knowledgeBase;
  }
}
