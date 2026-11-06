import {
  ProviderTimeoutError,
  ProviderUnavailableError,
} from 'src/common/errors/provider.errors';
import {
  DocumentConversionTimeoutError,
  DocumentConversionUnavailableError,
  EmptyOcrResultError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  EmptyFileDataError,
  SpreadsheetParseTimeoutError,
} from 'src/domain/sources/application/sources.errors';
import { SourceProcessingErrorCode as Code } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { StorageUnavailableError } from 'src/domain/storage/application/storage.errors';

type ErrorClass = abstract new (...args: never[]) => unknown;

// Ordered: a subclass must come before its parent (the conversion timeout is
// an UnprocessableDocumentError but is shown as a timeout, not as unreadable).
const CLASSIFICATION: ReadonlyArray<[ErrorClass, Code]> = [
  [TooManyPagesError, Code.DOCUMENT_PAGE_LIMIT_EXCEEDED],
  [EmptyOcrResultError, Code.DOCUMENT_EMPTY],
  [EmptyFileDataError, Code.DOCUMENT_EMPTY],
  [DocumentConversionTimeoutError, Code.PROCESSING_TIMEOUT],
  [UnprocessableDocumentError, Code.DOCUMENT_UNREADABLE],
  [ProviderTimeoutError, Code.PROCESSING_TIMEOUT],
  [SpreadsheetParseTimeoutError, Code.PROCESSING_TIMEOUT],
  [ProviderUnavailableError, Code.PROCESSING_UNAVAILABLE],
  [DocumentConversionUnavailableError, Code.PROCESSING_UNAVAILABLE],
  [StorageUnavailableError, Code.PROCESSING_UNAVAILABLE],
];

export function classifySourceProcessingError(error: unknown): Code {
  const match = CLASSIFICATION.find(([type]) => error instanceof type);
  return match ? match[1] : Code.PROCESSING_FAILED;
}
