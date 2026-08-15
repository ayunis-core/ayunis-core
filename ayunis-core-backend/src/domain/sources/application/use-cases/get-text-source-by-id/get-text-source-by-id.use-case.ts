import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetTextSourceByIdQuery } from './get-text-source-by-id.query';
import { SourceNotFoundError } from '../../sources.errors';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetTextSourceByIdUseCase {
  constructor(
    @InjectPinoLogger(GetTextSourceByIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly textSourceRepository: SourceRepository,
  ) {}

  async execute(query: GetTextSourceByIdQuery): Promise<Source> {
    this.logger.info({ id: query.id }, 'execute');
    try {
      const source = await this.textSourceRepository.findById(query.id);
      if (!source) {
        throw new SourceNotFoundError(query.id);
      }
      return source;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error getting text source by ID',
      );
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
