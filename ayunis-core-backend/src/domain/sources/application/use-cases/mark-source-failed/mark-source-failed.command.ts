import type { UUID } from 'crypto';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';

export class MarkSourceFailedCommand {
  readonly sourceId: UUID;
  readonly errorMessage: string;
  readonly errorCode: SourceProcessingErrorCode;

  constructor(params: {
    sourceId: UUID;
    errorMessage: string;
    errorCode?: SourceProcessingErrorCode;
  }) {
    this.sourceId = params.sourceId;
    this.errorMessage = params.errorMessage;
    this.errorCode =
      params.errorCode ?? SourceProcessingErrorCode.PROCESSING_FAILED;
  }
}
