import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { UnexpectedSourceError } from '../../sources.errors';
import { GetSourcesByKnowledgeBaseIdQuery } from './get-sources-by-knowledge-base-id.query';

@Injectable()
export class GetSourcesByKnowledgeBaseIdUseCase {
  private readonly logger = new Logger(GetSourcesByKnowledgeBaseIdUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(query: GetSourcesByKnowledgeBaseIdQuery): Promise<Source[]> {
    this.logger.log('Finding sources by knowledge base ID', {
      knowledgeBaseId: query.knowledgeBaseId,
    });

    return await this.sourceRepository.findByKnowledgeBaseId(
      query.knowledgeBaseId,
    );
  }
}
