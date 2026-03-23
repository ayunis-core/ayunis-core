import { Injectable, Logger } from '@nestjs/common';
import { SourceRepository } from '../../ports/source.repository';
import { ExtractTextLinesQuery } from './extract-text-lines.query';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ExtractTextLinesUseCase {
  private readonly logger = new Logger(ExtractTextLinesUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(
    query: ExtractTextLinesQuery,
  ): Promise<{ totalLines: number; text: string } | null> {
    this.logger.log('execute', { sourceId: query.sourceId });
    try {
      return await this.sourceRepository.extractTextLines(
        query.sourceId,
        query.startLine,
        query.endLine,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error extracting text lines', {
        error: error as Error,
      });
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
