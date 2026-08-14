import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(ExtractTextLinesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(
    query: ExtractTextLinesQuery,
  ): Promise<ExtractTextLinesResult | null> {
    this.logger.info(
      {
        sourceId: query.sourceId,
        startLine: query.startLine,
        endLine: query.endLine,
      },
      'Extracting text lines',
    );

    try {
      return await this.sourceRepository.extractTextLines(
        query.sourceId,
        query.startLine,
        query.endLine,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error extracting text lines',
      );
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
