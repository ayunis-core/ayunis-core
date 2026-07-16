import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    query: ExtractTextLinesQuery,
  ): Promise<ExtractTextLinesResult | null> {
    this.logger.log('Extracting text lines', {
      sourceId: query.sourceId,
      startLine: query.startLine,
      endLine: query.endLine,
    });

    return await this.sourceRepository.extractTextLines(
      query.sourceId,
      query.startLine,
      query.endLine,
    );
  }
}
