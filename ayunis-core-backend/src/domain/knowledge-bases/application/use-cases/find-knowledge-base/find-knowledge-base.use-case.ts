import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { FindKnowledgeBaseQuery } from './find-knowledge-base.query';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

@Injectable()
export class FindKnowledgeBaseUseCase {
  constructor(
    @InjectPinoLogger(FindKnowledgeBaseUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(query: FindKnowledgeBaseQuery): Promise<KnowledgeBase> {
    this.logger.info(
      {
        id: query.id,
        userId: query.userId,
      },
      'Finding knowledge base',
    );

    const knowledgeBase = await this.knowledgeBaseRepository.findById(query.id);
    if (knowledgeBase?.userId !== query.userId) {
      throw new KnowledgeBaseNotFoundError(query.id);
    }

    return knowledgeBase;
  }
}
