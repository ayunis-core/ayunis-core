import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { SourceRepository } from '../../ports/source.repository';
import { UnexpectedSourceError } from '../../sources.errors';
import { ExtractTextLinesQuery } from './extract-text-lines.query';

export interface ExtractTextLinesResult {
  totalLines: number;
  text: string;
}

@Injectable()
export class ExtractTextLinesUseCase {
  private readonly logger = new Logger(ExtractTextLinesUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async execute(
    query: ExtractTextLinesQuery,
  ): Promise<ExtractTextLinesResult | null> {
    this.logger.log('Extracting text lines', {
      sourceId: query.sourceId,
      startLine: query.startLine,
      endLine: query.endLine,
    });

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
