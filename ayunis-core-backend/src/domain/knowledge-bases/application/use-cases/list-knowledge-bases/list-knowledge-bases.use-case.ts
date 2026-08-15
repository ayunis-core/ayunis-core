import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { ListKnowledgeBasesQuery } from './list-knowledge-bases.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';

@Injectable()
export class ListKnowledgeBasesUseCase {
  constructor(
    @InjectPinoLogger(ListKnowledgeBasesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(query: ListKnowledgeBasesQuery): Promise<KnowledgeBase[]> {
    this.logger.info({ userId: query.userId }, 'Listing knowledge bases');

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
