import type { ApplicationError } from 'src/common/errors/base.error';
import {
  type ProviderErrorContext,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import {
  DocumentConversionUnavailableError,
  EmptyOcrResultError,
  FileRetrievalFailedError,
  FileTooLargeError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import type { ExtractionJobFailure } from 'src/domain/sources/application/ports/document-extraction.port';
import { DocumentExtractionFailedError } from 'src/domain/sources/application/sources.errors';
import { StorageUnavailableError } from 'src/domain/storage/application/storage.errors';

type FailureMapper = (
  failure: ExtractionJobFailure,
  fileName: string | undefined,
) => ApplicationError;

function numberDetail(
  failure: ExtractionJobFailure,
  name: string,
): number | undefined {
  const value = failure.details?.[name];
  return typeof value === 'number' ? value : undefined;
}

/**
 * OCR failures keep `provider: 'mistral'` so they land in the same AppSignal
 * incident as today's in-process OCR calls.
 */
function ocrContext(failure: ExtractionJobFailure): ProviderErrorContext {
  const upstreamStatus = numberDetail(failure, 'status');
  return {
    provider: 'mistral',
    upstreamCode: failure.code,
    ...(upstreamStatus !== undefined && { upstreamStatus }),
  };
}

/** Contract §10.2, one entry per service code with a dedicated backend error. */
const MAPPERS: Record<string, FailureMapper> = {
  TOO_MANY_PAGES: (failure, fileName) =>
    new TooManyPagesError({
      fileName,
      pageCount: numberDetail(failure, 'pageCount'),
      maxPages: numberDetail(failure, 'maxPages'),
    }),
  UNPROCESSABLE_DOCUMENT: (failure, fileName) =>
    new UnprocessableDocumentError(failure.message, { fileName }),
  EMPTY_DOCUMENT: (_failure, fileName) => new EmptyOcrResultError({ fileName }),
  INPUT_TOO_LARGE: (_failure, fileName) => new FileTooLargeError({ fileName }),
  CONVERSION_UNAVAILABLE: (_failure, fileName) =>
    new DocumentConversionUnavailableError(fileName ?? ''),
  CONVERSION_FAILED: (failure, fileName) =>
    new FileRetrievalFailedError(failure.message, { fileName }),
  OCR_UNAVAILABLE: (failure) => new ProviderServerError(ocrContext(failure)),
  OCR_TIMEOUT: (failure) => new ProviderTimeoutError(ocrContext(failure)),
  OCR_REJECTED: (failure) =>
    new ProviderRequestRejectedError(ocrContext(failure)),
  STORAGE_UNAVAILABLE: () => new StorageUnavailableError(),
  JOB_TIMEOUT: (failure) =>
    new ProviderTimeoutError({
      provider: 'extraction',
      upstreamCode: failure.code,
    }),
};

const fallback: FailureMapper = (failure, fileName) =>
  new DocumentExtractionFailedError(
    failure.code,
    failure.message,
    failure.retryable,
    { fileName, details: failure.details },
  );

/**
 * The one place a service failure becomes a backend error, so
 * classifySourceProcessingError and classifyJobFailure keep their shape.
 */
export function mapExtractionFailure(
  failure: ExtractionJobFailure,
  fileName?: string,
): ApplicationError {
  return (MAPPERS[failure.code] ?? fallback)(failure, fileName);
}
