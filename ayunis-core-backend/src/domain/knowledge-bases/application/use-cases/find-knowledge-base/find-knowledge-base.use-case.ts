import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(query: FindKnowledgeBaseQuery): Promise<KnowledgeBase> {
    this.logger.log('Finding knowledge base', {
      id: query.id,
      userId: query.userId,
    });

    try {
      const knowledgeBase = await this.knowledgeBaseRepository.findById(
        query.id,
      );
      if (knowledgeBase?.userId !== query.userId) {
        throw new KnowledgeBaseNotFoundError(query.id);
      }

      return knowledgeBase;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error finding knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError('Error finding knowledge base', {
        error: error as Error,
      });
    }
  }
}
