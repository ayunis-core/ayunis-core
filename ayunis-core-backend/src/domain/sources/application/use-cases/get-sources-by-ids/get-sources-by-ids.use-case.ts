import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetSourcesByIdsQuery } from './get-sources-by-ids.query';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetSourcesByIdsUseCase {
  constructor(
    @InjectPinoLogger(GetSourcesByIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: GetSourcesByIdsQuery): Promise<Source[]> {
    this.logger.info({ count: query.sourceIds.length }, 'execute');
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
