import { Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetSourceByIdQuery } from './get-source-by-id.query';
import { SourceNotFoundError } from '../../sources.errors';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetSourceByIdUseCase {
  private readonly logger = new Logger(GetSourceByIdUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(query: GetSourceByIdQuery): Promise<Source> {
    this.logger.log('execute', { id: query.sourceId });
    try {
      const source = await this.sourceRepository.findById(query.sourceId);
      if (!source) {
        throw new SourceNotFoundError(query.sourceId);
      }
      return source;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error getting source by ID', {
        error: error as Error,
      });
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
