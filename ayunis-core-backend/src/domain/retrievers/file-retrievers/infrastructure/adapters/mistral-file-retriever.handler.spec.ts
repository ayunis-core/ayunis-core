import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MistralFileRetrieverHandler } from './mistral-file-retriever.handler';
import {
  EmptyOcrResultError,
  FileRetrieverUnexpectedError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';

// Mock the Mistral SDK
jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn().mockImplementation(() => ({
    ocr: {
      process: jest.fn(),
    },
  })),
}));

// Mock retryWithBackoff with single-retry semantics so tests can assert
// which errors the call sites treat as retryable
jest.mock('src/common/util/retryWithBackoff', () => ({
  __esModule: true,
  default: async ({
    fn,
    retryIfError,
  }: {
    fn: () => Promise<unknown>;
    retryIfError?: (error: Error) => boolean;
  }) => {
    try {
      return await fn();
    } catch (error) {
      if (retryIfError?.(error as Error)) {
        return fn();
      }
      throw error;
    }
  },
}));

function createMistralError(statusCode: number, body: string): MistralError {
  const response = {
    status: statusCode,
    headers: new Headers({ 'content-type': 'application/json' }),
    url: 'https://api.mistral.ai/v1/ocr',
  } as unknown as Response;
  const request = {} as Request;
  const error = new MistralError(`API error: ${statusCode}`, {
    response,
    request,
    body,
  });
  return error;
}

describe('MistralFileRetrieverHandler', () => {
  let handler: MistralFileRetrieverHandler;
  let mockClient: {
    ocr: { process: jest.Mock };
  };

  const testFile = new File(
    Buffer.from('fake pdf content'),
    'test-document.pdf',
    'application/pdf',
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MistralFileRetrieverHandler,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'retrieval.mistral.apiKey' ? 'test-api-key' : undefined,
            ),
          },
        },
      ],
    }).compile();

    handler = module.get(MistralFileRetrieverHandler);
    // Access the mocked client created by the constructor
    mockClient = (handler as unknown as { client: typeof mockClient }).client;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('client construction', () => {
    it('bounds each OCR attempt with a 120s timeout instead of 5 minutes', () => {
      const { Mistral } = jest.requireMock<{ Mistral: jest.Mock }>(
        '@mistralai/mistralai',
      );
      expect(Mistral).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: 120_000 }),
      );
    });

    it('targets the EU server', () => {
      const { Mistral } = jest.requireMock<{ Mistral: jest.Mock }>(
        '@mistralai/mistralai',
      );
      expect(Mistral).toHaveBeenLastCalledWith(
        expect.objectContaining({ server: 'eu' }),
      );
    });
  });

  describe('OCR flow', () => {
    it('sends the document inline as a base64 data URL', async () => {
      mockClient.ocr.process.mockResolvedValue({
        pages: [{ markdown: '# Content', index: 0 }],
      });

      const result = await handler.processFile(testFile);

      expect(mockClient.ocr.process).toHaveBeenCalledWith(
        expect.objectContaining({
          document: {
            type: 'document_url',
            documentUrl: `data:application/pdf;base64,${Buffer.from('fake pdf content').toString('base64')}`,
          },
        }),
      );
      expect(result.pages).toHaveLength(1);
    });

    it('limits OCR to the requested page window', async () => {
      mockClient.ocr.process.mockResolvedValue({
        pages: [{ markdown: '# Content', index: 0 }],
      });

      await handler.processFile(testFile, { pageLimit: 51 });

      expect(mockClient.ocr.process).toHaveBeenCalledWith(
        expect.objectContaining({ pages: '0-50' }),
      );
    });

    // A zero-page OCR response is a property of the document, not a defect
    // of ours: it must surface as the shared "we cannot read this document"
    // classification (422, terminal in the queue, user-visible message)
    // instead of alerting as UNEXPECTED_ERROR (AYC-655).
    it('classifies a zero-page OCR response for local PDF fallback', async () => {
      mockClient.ocr.process.mockResolvedValue({ pages: [] });

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(EmptyOcrResultError);
      await expect(result).rejects.toMatchObject({
        code: 'UNPROCESSABLE_DOCUMENT',
        statusCode: 422,
      });
    });

    it('gives the zero-page failure a user-presentable message without the raw response', async () => {
      mockClient.ocr.process.mockResolvedValue({ pages: [] });

      const error: unknown = await handler
        .processFile(testFile)
        .then(() => undefined)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnprocessableDocumentError);
      const documentError = error as UnprocessableDocumentError;
      expect(documentError.message).toMatch(/no text could be extracted/i);
      expect(documentError.metadata).not.toHaveProperty('response');
    });

    // The OCR result is consumed markdown-only; requesting image payloads
    // inflates the response body Mistral streams back, which is what pushed
    // large documents into the 120s body-read deadline (AYC-655).
    it('requests image text annotations without returning image payloads', async () => {
      mockClient.ocr.process.mockResolvedValue({
        pages: [{ markdown: '# Content', index: 0, images: [] }],
      });

      await handler.processFile(testFile);

      expect(mockClient.ocr.process).toHaveBeenCalledWith(
        expect.objectContaining({
          includeImageBase64: false,
          bboxAnnotationFormat: expect.objectContaining({
            type: 'json_schema',
            jsonSchema: expect.objectContaining({ name: 'image_text' }),
          }),
        }),
      );
    });

    it('includes visible text extracted from screenshots embedded in a PDF', async () => {
      mockClient.ocr.process.mockResolvedValue({
        pages: [
          {
            markdown: '![img-0.jpeg](img-0.jpeg)',
            index: 0,
            images: [
              {
                id: 'img-0.jpeg',
                imageAnnotation: JSON.stringify({
                  text: 'Case 417: inspection completed on 14 March',
                }),
              },
            ],
          },
        ],
      });

      const result = await handler.processFile(testFile);

      expect(result.pages[0].text).toContain(
        'Case 417: inspection completed on 14 March',
      );
    });

    it('does not retry a 404, which no longer means a not-yet-visible upload', async () => {
      mockClient.ocr.process.mockRejectedValue(
        createMistralError(404, '{"message":"no Route matched"}'),
      );

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(ProviderRequestRejectedError);
      await expect(result).rejects.toMatchObject({
        context: { upstreamStatus: 404 },
      });
      expect(mockClient.ocr.process).toHaveBeenCalledTimes(1);
    });

    it('should not retry client errors like too many pages', async () => {
      const tooManyPages = createMistralError(
        400,
        '{"type":"document_parser_too_many_pages"}',
      );
      mockClient.ocr.process.mockRejectedValue(tooManyPages);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        TooManyPagesError,
      );
      expect(mockClient.ocr.process).toHaveBeenCalledTimes(1);
    });
  });

  describe('transient upstream error handling', () => {
    it('throws ProviderRequestRejectedError when Mistral rate limiting persists past retries', async () => {
      const mistralError = createMistralError(
        429,
        '{"message":"Rate limit exceeded"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(ProviderRequestRejectedError);
      await expect(result).rejects.toMatchObject({
        context: { upstreamStatus: 429 },
      });
    });

    it('throws ProviderServerError when Mistral returns 502', async () => {
      const mistralError = createMistralError(
        502,
        '{"message":"An invalid response was received from the upstream server"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(ProviderServerError);
      await expect(result).rejects.toMatchObject({
        code: 'PROVIDER_UNAVAILABLE_SERVER_MISTRAL',
        context: {
          provider: 'mistral',
          modelId: 'mistral-ocr-latest',
          upstreamStatus: 502,
        },
      });
    });

    it('throws ProviderServerError when Mistral returns 503', async () => {
      const mistralError = createMistralError(
        503,
        '{"message":"Service temporarily unavailable"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        ProviderServerError,
      );
    });

    it('throws ProviderTimeoutError when Mistral returns 504', async () => {
      const mistralError = createMistralError(
        504,
        '{"message":"Gateway timeout"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        ProviderTimeoutError,
      );
    });

    it('should throw TooManyPagesError when Mistral rejects the document for its page count', async () => {
      const mistralError = createMistralError(
        400,
        '{"object":"error","message":"This document has 1486 pages, which is more than the maximum allowed of 1000.","type":"document_parser_too_many_pages","code":"3730"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        TooManyPagesError,
      );
    });

    it('should throw UnprocessableDocumentError for other Mistral 400 responses', async () => {
      const mistralError = createMistralError(
        400,
        '{"object":"error","message":"File is corrupted and cannot be parsed.","type":"invalid_request_file","code":"3310"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(UnprocessableDocumentError);
      // 422 is what keeps a corrupt upload out of AppSignal and stops the queue
      // from re-sending it to Mistral — see classifyJobFailure.
      await expect(result).rejects.toMatchObject({ statusCode: 422 });
      expect(mockClient.ocr.process).toHaveBeenCalledTimes(1);
    });

    it('classifies a PDF rejected by Mistral parsing as an unprocessable document', async () => {
      const mistralError = createMistralError(
        400,
        '{"object":"error","message":"Document is not a valid PDF.","type":"document_parser_invalid_file","code":"3740"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        UnprocessableDocumentError,
      );
    });

    it('classifies Mistral invalid_file code 1901 as an unprocessable document without retrying', async () => {
      const mistralError = createMistralError(
        422,
        '{"object":"error","message":"Could not get file.","type":"invalid_file","code":"1901","raw_status_code":422}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        UnprocessableDocumentError,
      );
      expect(mockClient.ocr.process).toHaveBeenCalledTimes(1);
    });

    it('classifies Mistral invalid file format responses as unprocessable without retrying', async () => {
      const mistralError = createMistralError(
        422,
        '{"detail":"Invalid file format.","message":"Received file with mimetype application/x-empty"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        UnprocessableDocumentError,
      );
      expect(mockClient.ocr.process).toHaveBeenCalledTimes(1);
    });

    it('classifies unrecognized Mistral 422 responses as unprocessable documents', async () => {
      const mistralError = createMistralError(
        422,
        '{"detail":"Document could not be accepted for OCR"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(UnprocessableDocumentError);
      await expect(result).rejects.toMatchObject({ statusCode: 422 });
      expect(mockClient.ocr.process).toHaveBeenCalledTimes(1);
    });

    it('does not classify a different rejection that only mentions the parser error type as a document error', async () => {
      const mistralError = createMistralError(
        400,
        '{"message":"Unexpected document_parser_invalid_file value","type":"invalid_request"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        ProviderRequestRejectedError,
      );
    });

    it('throws ProviderRequestRejectedError for Mistral OCR 400s — provider failures per AYC-538', async () => {
      const mistralError = createMistralError(400, '{"message":"Bad request"}');
      mockClient.ocr.process.mockRejectedValue(mistralError);

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(ProviderRequestRejectedError);
      await expect(result).rejects.toMatchObject({
        code: 'PROVIDER_UNAVAILABLE_REJECTED_MISTRAL',
        context: { upstreamStatus: 400 },
      });
    });

    it('keeps Mistral 401 as FileRetrieverUnexpectedError — bad API key is our config bug', async () => {
      const mistralError = createMistralError(
        401,
        '{"message":"Unauthorized","type":"document_parser_invalid_file"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        FileRetrieverUnexpectedError,
      );
    });

    it('throws ProviderConnectionError for transport failures behind SDK wrappers', async () => {
      const transport = Object.assign(new Error('connection error'), {
        name: 'ConnectionError',
        cause: Object.assign(new Error('read ECONNRESET'), {
          code: 'ECONNRESET',
        }),
      });
      mockClient.ocr.process.mockRejectedValue(transport);

      const result = handler.processFile(testFile);
      await expect(result).rejects.toBeInstanceOf(ProviderConnectionError);
      await expect(result).rejects.toMatchObject({
        context: { underlyingCode: 'ECONNRESET' },
      });
    });

    it('logs the upstream status, type, code and a redacted explanation of an OCR rejection once', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      mockClient.ocr.process.mockRejectedValue(
        createMistralError(
          400,
          '{"object":"error","message":"Unsupported document \'Gutachten Meier.pdf\'","type":"invalid_request_ocr","param":null,"code":"3210"}',
        ),
      );

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        ProviderRequestRejectedError,
      );

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          upstreamStatus: 400,
          upstreamType: 'invalid_request_ocr',
          upstreamCode: '3210',
          upstreamMessage: "Unsupported document '…",
        }),
        'Mistral OCR processing failed',
      );
      // `err` is censored by the production logger's redaction paths.
      const [context] = errorSpy.mock.calls[0] as [Record<string, unknown>];
      const diagnostics = Object.entries(context).filter(
        ([key]) => key !== 'err',
      );
      expect(JSON.stringify(diagnostics)).not.toContain('Meier');
    });

    it('logs no upstream diagnostics for failures that are not provider responses', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      mockClient.ocr.process.mockRejectedValue(
        new Error('cannot read properties of undefined'),
      );

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        FileRetrieverUnexpectedError,
      );

      const [context] = errorSpy.mock.calls[0] as [Record<string, unknown>];
      expect(Object.keys(context)).toEqual(['err']);
    });

    it('throws FileRetrieverUnexpectedError for non-Mistral errors', async () => {
      mockClient.ocr.process.mockRejectedValue(
        new Error('cannot read properties of undefined'),
      );

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        FileRetrieverUnexpectedError,
      );
    });
  });
});
