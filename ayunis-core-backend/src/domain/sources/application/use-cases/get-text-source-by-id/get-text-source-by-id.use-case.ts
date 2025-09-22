import { Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetTextSourceByIdQuery } from './get-text-source-by-id.query';
import { SourceNotFoundError } from '../../sources.errors';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetTextSourceByIdUseCase {
  private readonly logger = new Logger(GetTextSourceByIdUseCase.name);

  constructor(private readonly textSourceRepository: SourceRepository) {}

  async execute(query: GetTextSourceByIdQuery): Promise<Source> {
    this.logger.log('execute', { id: query.id });
    try {
      const source = await this.textSourceRepository.findById(query.id);
      if (!source) {
        throw new SourceNotFoundError(query.id);
      }
      return source;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error getting text source by ID', {
        error: error as Error,
      });
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
