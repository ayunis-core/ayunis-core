import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

@Injectable()
export class ListKnowledgeBasesUseCase {
  private readonly logger = new Logger(ListKnowledgeBasesUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(query: ListKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.log({ userId: query.userId }, 'Listing knowledge bases');

    try {
      return await this.knowledgeBaseRepository.findAllByUserId(query.userId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error listing knowledge bases',
      );
      throw new UnexpectedKnowledgeBaseError('Error listing knowledge bases', {
        err: error as Error,
      });
    }
  }
}
