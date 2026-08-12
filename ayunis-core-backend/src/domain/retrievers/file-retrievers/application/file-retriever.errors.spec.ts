import {
  FileRetrieverUnexpectedError,
  UnprocessableDocumentError,
} from './file-retriever.errors';

describe('FileRetrieverError HTTP responses', () => {
  it('does not expose server-error details', () => {
    const error = new FileRetrieverUnexpectedError(
      new Error('OCR endpoint rejected apiKey=secret'),
      { providerHost: 'ocr.internal.ayunis.com' },
    );

    expect(error.toHttpException().getResponse()).toEqual({
      code: 'UNEXPECTED_ERROR',
      message: 'Internal server error',
    });
  });

  it('preserves client-error details', () => {
    const error = new UnprocessableDocumentError('Document is malformed', {
      fileType: 'application/pdf',
    });

    expect(error.toHttpException().getResponse()).toEqual({
      code: 'UNPROCESSABLE_DOCUMENT',
      message: 'Document is malformed',
      metadata: { fileType: 'application/pdf' },
    });
  });
});
