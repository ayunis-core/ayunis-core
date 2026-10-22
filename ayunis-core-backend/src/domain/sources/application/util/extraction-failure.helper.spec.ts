import {
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
import { DocumentExtractionFailedError } from 'src/domain/sources/application/sources.errors';
import { classifySourceProcessingError } from 'src/domain/sources/application/services/classify-source-processing-error';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { StorageUnavailableError } from 'src/domain/storage/application/storage.errors';
import { isExpectedFailure } from 'src/domain/sources/infrastructure/queue/bullmq-job.helpers';
import { mapExtractionFailure } from './extraction-failure.helper';

function failure(
  code: string,
  retryable = false,
  details?: Record<string, unknown>,
) {
  return { code, message: `service said ${code}`, retryable, details };
}

describe('mapExtractionFailure', () => {
  it.each([
    ['TOO_MANY_PAGES', TooManyPagesError, 'DOCUMENT_PAGE_LIMIT_EXCEEDED'],
    [
      'UNPROCESSABLE_DOCUMENT',
      UnprocessableDocumentError,
      'DOCUMENT_UNREADABLE',
    ],
    ['EMPTY_DOCUMENT', EmptyOcrResultError, 'DOCUMENT_EMPTY'],
    ['INPUT_TOO_LARGE', FileTooLargeError, 'PROCESSING_FAILED'],
  ])(
    'settles %s as a document error the user can act on',
    (code, errorClass, processingCode) => {
      const error = mapExtractionFailure(failure(code), 'report.pdf');

      expect(error).toBeInstanceOf(errorClass);
      expect(isExpectedFailure(error)).toBe(true);
      expect(classifySourceProcessingError(error)).toBe(processingCode);
    },
  );

  it('carries the page counts into the page-limit message', () => {
    const error = mapExtractionFailure(
      failure('TOO_MANY_PAGES', false, { pageCount: 1200, maxPages: 1000 }),
      'report.pdf',
    );

    expect(error.message).toBe(
      'This document has 1200 pages; the maximum is 1000.',
    );
  });

  it.each([
    ['OCR_UNAVAILABLE', ProviderServerError, 'PROCESSING_UNAVAILABLE'],
    ['OCR_TIMEOUT', ProviderTimeoutError, 'PROCESSING_TIMEOUT'],
    ['STORAGE_UNAVAILABLE', StorageUnavailableError, 'PROCESSING_UNAVAILABLE'],
    ['JOB_TIMEOUT', ProviderTimeoutError, 'PROCESSING_TIMEOUT'],
    [
      'CONVERSION_UNAVAILABLE',
      DocumentConversionUnavailableError,
      'PROCESSING_UNAVAILABLE',
    ],
    ['CONVERSION_FAILED', FileRetrievalFailedError, 'PROCESSING_FAILED'],
  ])(
    'keeps %s in the provider taxonomy',
    (code, errorClass, processingCode) => {
      const error = mapExtractionFailure(failure(code, true), 'report.pdf');

      expect(error).toBeInstanceOf(errorClass);
      expect(isExpectedFailure(error)).toBe(false);
      expect(classifySourceProcessingError(error)).toBe(processingCode);
    },
  );

  it('groups OCR outages under the mistral provider key as today', () => {
    const error = mapExtractionFailure(failure('OCR_UNAVAILABLE', true));

    expect(error.code).toBe('PROVIDER_UNAVAILABLE_SERVER_MISTRAL');
  });

  it('treats an OCR rejection as deterministic unless the provider status says otherwise', () => {
    const rejected = mapExtractionFailure(failure('OCR_REJECTED'));
    const rateLimited = mapExtractionFailure(
      failure('OCR_REJECTED', false, { status: 429 }),
    );

    expect(rejected).toBeInstanceOf(ProviderRequestRejectedError);
    expect(
      (rejected as ProviderRequestRejectedError).context.upstreamStatus,
    ).toBeUndefined();
    expect(
      (rateLimited as ProviderRequestRejectedError).context.upstreamStatus,
    ).toBe(429);
  });

  it.each([
    ['INTERNAL', false, 500, SourceProcessingErrorCode.PROCESSING_FAILED],
    ['RESTART_LIMIT', false, 500, SourceProcessingErrorCode.PROCESSING_FAILED],
    [
      'OCR_UNAUTHORIZED',
      false,
      500,
      SourceProcessingErrorCode.PROCESSING_FAILED,
    ],
    [
      'SERVICE_UNAVAILABLE',
      true,
      503,
      SourceProcessingErrorCode.PROCESSING_UNAVAILABLE,
    ],
  ])(
    'maps %s to the generic extraction failure keyed on retryability',
    (code, retryable, statusCode, processingCode) => {
      const error = mapExtractionFailure(failure(code, retryable), 'a.pdf');

      expect(error).toBeInstanceOf(DocumentExtractionFailedError);
      expect(error.statusCode).toBe(statusCode);
      expect((error as DocumentExtractionFailedError).serviceCode).toBe(code);
      expect(classifySourceProcessingError(error)).toBe(processingCode);
    },
  );
});
