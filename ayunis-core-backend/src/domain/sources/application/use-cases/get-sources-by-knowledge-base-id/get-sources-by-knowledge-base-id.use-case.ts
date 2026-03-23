import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import type { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { UnexpectedSourceError } from '../../sources.errors';
import { GetSourcesByKnowledgeBaseIdQuery } from './get-sources-by-knowledge-base-id.query';

@Injectable()
export class GetSourcesByKnowledgeBaseIdUseCase {
  private readonly logger = new Logger(GetSourcesByKnowledgeBaseIdUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(query: GetSourcesByKnowledgeBaseIdQuery): Promise<Source[]> {
    this.logger.log('Finding sources by knowledge base ID', {
      knowledgeBaseId: query.knowledgeBaseId,
    });

    try {
      return await this.sourceRepository.findByKnowledgeBaseId(
        query.knowledgeBaseId,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding sources by knowledge base ID', {
        error: error as Error,
      });
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
