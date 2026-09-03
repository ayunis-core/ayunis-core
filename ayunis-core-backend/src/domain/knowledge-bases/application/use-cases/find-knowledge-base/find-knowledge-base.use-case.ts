import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindKnowledgeBaseUseCase {
  private readonly logger = new Logger(FindKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(query: FindKnowledgeBaseQuery): Promise<KnowledgeBase> {
    this.logger.log(
      {
        id: query.id,
        userId: query.userId,
      },
      'Finding knowledge base',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding knowledge base',
      );
      throw new UnexpectedKnowledgeBaseError('Error finding knowledge base', {
        err: error as Error,
      });
    }
  }
}
