import { Injectable, Logger } from '@nestjs/common';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { GetTextSourceByIdQuery } from './get-text-source-by-id.query';
import { SourceNotFoundError } from 'src/domain/sources/application/sources.errors';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetTextSourceByIdUseCase {
  private readonly logger = new Logger(GetTextSourceByIdUseCase.name);

  constructor(private readonly textSourceRepository: SourceRepository) {}

  async execute(query: GetTextSourceByIdQuery): Promise<Source> {
    this.logger.log({ id: query.id }, 'execute');
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
