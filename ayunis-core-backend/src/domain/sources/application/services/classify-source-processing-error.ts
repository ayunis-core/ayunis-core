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
  DocumentExtractionFailedError,
  EmptyFileDataError,
  SpreadsheetParseTimeoutError,
} from 'src/domain/sources/application/sources.errors';
import { SourceProcessingErrorCode as Code } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { StorageUnavailableError } from 'src/domain/storage/application/storage.errors';

type Classifier = [matches: (error: unknown) => boolean, code: Code];

/** Ordered: the first matching rule wins, so subclasses come before their parents. */
const CLASSIFIERS: Classifier[] = [
  [(e) => e instanceof TooManyPagesError, Code.DOCUMENT_PAGE_LIMIT_EXCEEDED],
  [
    (e) => e instanceof EmptyOcrResultError || e instanceof EmptyFileDataError,
    Code.DOCUMENT_EMPTY,
  ],
  [(e) => e instanceof UnprocessableDocumentError, Code.DOCUMENT_UNREADABLE],
  [
    (e) =>
      e instanceof ProviderTimeoutError ||
      e instanceof SpreadsheetParseTimeoutError,
    Code.PROCESSING_TIMEOUT,
  ],
  [
    (e) =>
      e instanceof ProviderUnavailableError ||
      e instanceof DocumentConversionUnavailableError ||
      e instanceof StorageUnavailableError ||
      (e instanceof DocumentExtractionFailedError && e.retryable),
    Code.PROCESSING_UNAVAILABLE,
  ],
];

export function classifySourceProcessingError(error: unknown): Code {
  return (
    CLASSIFIERS.find(([matches]) => matches(error))?.[1] ??
    Code.PROCESSING_FAILED
  );
}
