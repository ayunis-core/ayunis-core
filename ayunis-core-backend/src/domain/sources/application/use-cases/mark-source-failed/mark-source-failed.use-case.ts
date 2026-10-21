import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  SourceNotFoundError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { recordSourceProcessingFailure } from 'src/domain/sources/application/util/document-processing-metrics.helper';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { MarkSourceFailedCommand } from './mark-source-failed.command';

// file | web | csv: the concrete kind, which `Source.type` (text | data) hides.
function sourceKind(source: Source): string {
  if (source instanceof TextSource) return source.textType;
  if (source instanceof DataSource) return source.dataType;
  return source.type;
}

@Injectable()
export class MarkSourceFailedUseCase {
  private readonly logger = new Logger(MarkSourceFailedUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: MarkSourceFailedCommand): Promise<void> {
    const source = await this.sourceRepository.findById(command.sourceId);
    if (!source) throw new SourceNotFoundError(command.sourceId);

    source.status = SourceStatus.FAILED;
    source.processingError = command.errorMessage;
    source.processingErrorCode = command.errorCode;
    await this.sourceRepository.save(source);
    recordSourceProcessingFailure(command.errorCode, sourceKind(source));

    this.logger.warn(
      { sourceId: command.sourceId, err: new Error(command.errorMessage) },
      'Source marked as failed',
    );
  }
}
