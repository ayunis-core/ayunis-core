import { classifySourceProcessingError } from './classify-source-processing-error';
import { SourceProcessingErrorCode as Code } from 'src/domain/sources/domain/source-processing-error-code.enum';
import {
  EmptyOcrResultError,
  TooManyPagesError,
  UnprocessableDocumentError,
  FileRetrieverUnauthorizedError,
  DocumentConversionUnavailableError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  EmptyFileDataError,
  SpreadsheetParseTimeoutError,
} from 'src/domain/sources/application/sources.errors';
import {
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import {
  StorageUnavailableError,
  UploadFailedError,
} from 'src/domain/storage/application/storage.errors';

describe('classifySourceProcessingError', () => {
  it.each([
    [
      new UnprocessableDocumentError('Different provider wording'),
      Code.DOCUMENT_UNREADABLE,
    ],
    [new EmptyOcrResultError(), Code.DOCUMENT_EMPTY],
    [new EmptyFileDataError('invoices.csv'), Code.DOCUMENT_EMPTY],
    [
      new TooManyPagesError({ pageCount: 120, maxPages: 100 }),
      Code.DOCUMENT_PAGE_LIMIT_EXCEEDED,
    ],
    [
      new ProviderTimeoutError({ provider: 'mistral' }),
      Code.PROCESSING_TIMEOUT,
    ],
    [new SpreadsheetParseTimeoutError(60_000), Code.PROCESSING_TIMEOUT],
    [
      new ProviderServerError({ provider: 'mistral' }),
      Code.PROCESSING_UNAVAILABLE,
    ],
    [
      new DocumentConversionUnavailableError('invoice.docx'),
      Code.PROCESSING_UNAVAILABLE,
    ],
    [
      new StorageUnavailableError({
        diagnostics: { upstreamCode: 'SlowDown' },
      }),
      Code.PROCESSING_UNAVAILABLE,
    ],
    [new UploadFailedError(), Code.PROCESSING_FAILED],
    [new FileRetrieverUnauthorizedError(), Code.PROCESSING_FAILED],
    [new Error('The document could not be processed'), Code.PROCESSING_FAILED],
    ['Processing timed out', Code.PROCESSING_FAILED],
    [undefined, Code.PROCESSING_FAILED],
  ])(
    'classifies typed errors without inspecting their message: %s',
    (error, code) => {
      expect(classifySourceProcessingError(error)).toBe(code);
    },
  );
});
