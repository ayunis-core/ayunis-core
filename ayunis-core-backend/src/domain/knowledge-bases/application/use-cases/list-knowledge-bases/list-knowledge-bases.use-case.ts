import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';

@Injectable()
export class ListKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListKnowledgeBasesUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(query: ListKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.log('Listing knowledge bases', { userId: query.userId });

    try {
      return await this.knowledgeBaseRepository.findAllByUserId(query.userId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error listing knowledge bases', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError('Error listing knowledge bases', {
        error: error as Error,
      });
    }
  }
}
