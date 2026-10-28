import { Injectable, Logger } from '@nestjs/common';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { GetSourcesByIdsQuery } from './get-sources-by-ids.query';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetSourcesByIdsUseCase {
  private readonly logger = new Logger(GetSourcesByIdsUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(query: GetSourcesByIdsQuery): Promise<Source[]> {
    this.logger.log({ count: query.sourceIds.length }, 'execute');
    try {
      if (query.sourceIds.length === 0) {
        return [];
      }
      return await this.sourceRepository.findByIds(query.sourceIds);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error getting sources by IDs',
      );
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
