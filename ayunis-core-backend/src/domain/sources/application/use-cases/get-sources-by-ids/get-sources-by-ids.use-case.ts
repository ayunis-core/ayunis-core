import { Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetSourcesByIdsQuery } from './get-sources-by-ids.query';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetSourcesByIdsUseCase {
  private readonly logger = new Logger(GetSourcesByIdsUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(query: GetSourcesByIdsQuery): Promise<Source[]> {
    this.logger.log('execute', { count: query.sourceIds.length });
    try {
      if (query.sourceIds.length === 0) {
        return [];
      }
      return await this.sourceRepository.findByIds(query.sourceIds);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error getting sources by IDs', {
        error: error as Error,
      });
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
