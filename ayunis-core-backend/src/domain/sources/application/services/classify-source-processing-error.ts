import {
  ProviderTimeoutError,
  ProviderUnavailableError,
} from 'src/common/errors/provider.errors';
import {
  DocumentConversionUnavailableError,
  EmptyOcrResultError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  EmptyFileDataError,
  SourceContentDegradedError,
  SpreadsheetParseTimeoutError,
} from 'src/domain/sources/application/sources.errors';
import { SourceProcessingErrorCode as Code } from 'src/domain/sources/domain/source-processing-error-code.enum';

export function classifySourceProcessingError(error: unknown): Code {
  if (error instanceof TooManyPagesError)
    return Code.DOCUMENT_PAGE_LIMIT_EXCEEDED;
  if (
    error instanceof EmptyOcrResultError ||
    error instanceof EmptyFileDataError
  )
    return Code.DOCUMENT_EMPTY;
  if (error instanceof UnprocessableDocumentError)
    return Code.DOCUMENT_UNREADABLE;
  if (
    error instanceof ProviderTimeoutError ||
    error instanceof SpreadsheetParseTimeoutError
  )
    return Code.PROCESSING_TIMEOUT;
  if (
    error instanceof ProviderUnavailableError ||
    error instanceof DocumentConversionUnavailableError
  )
    return Code.PROCESSING_UNAVAILABLE;
  if (error instanceof SourceContentDegradedError) return Code.CONTENT_DEGRADED;
  return Code.PROCESSING_FAILED;
}
