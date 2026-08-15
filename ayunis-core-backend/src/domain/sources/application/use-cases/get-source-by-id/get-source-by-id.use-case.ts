import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetSourceByIdQuery } from './get-source-by-id.query';
import { SourceNotFoundError } from '../../sources.errors';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetSourceByIdUseCase {
  constructor(
    @InjectPinoLogger(GetSourceByIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: GetSourceByIdQuery): Promise<Source> {
    this.logger.info({ id: query.sourceId }, 'execute');
    try {
      const source = await this.sourceRepository.findById(query.sourceId);
      if (!source) {
        throw new SourceNotFoundError(query.sourceId);
      }
      return source;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error getting source by ID',
      );
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
