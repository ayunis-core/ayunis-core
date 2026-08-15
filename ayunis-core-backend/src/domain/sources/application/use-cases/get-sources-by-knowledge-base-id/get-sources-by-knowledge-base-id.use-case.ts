import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { UnexpectedSourceError } from '../../sources.errors';
import { GetSourcesByKnowledgeBaseIdQuery } from './get-sources-by-knowledge-base-id.query';

@Injectable()
export class GetSourcesByKnowledgeBaseIdUseCase {
  constructor(
    @InjectPinoLogger(GetSourcesByKnowledgeBaseIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: GetSourcesByKnowledgeBaseIdQuery): Promise<Source[]> {
    this.logger.info(
      {
        knowledgeBaseId: query.knowledgeBaseId,
      },
      'Finding sources by knowledge base ID',
    );

    try {
      return await this.sourceRepository.findByKnowledgeBaseId(
        query.knowledgeBaseId,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding sources by knowledge base ID',
      );
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
