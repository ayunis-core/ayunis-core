import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MistralFileRetrieverHandler } from './mistral-file-retriever.handler';
import {
  FileRetrievalFailedError,
  FileRetrieverUnexpectedError,
  ServiceBusyError,
  ServiceTimeoutError,
  TooManyPagesError,
} from '../../application/file-retriever.errors';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { File } from '../../domain/file.entity';

// Mock the Mistral SDK
jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn().mockImplementation(() => ({
    files: {
      upload: jest.fn(),
      getSignedUrl: jest.fn(),
      delete: jest.fn(),
    },
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
    files: {
      upload: jest.Mock;
      getSignedUrl: jest.Mock;
      delete: jest.Mock;
    };
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
            get: jest.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    handler = module.get(MistralFileRetrieverHandler);
    // Access the mocked client created by the constructor
    mockClient = (handler as unknown as { client: typeof mockClient }).client;
  });

  describe('client construction', () => {
    it('bounds each file-API attempt with a 120s timeout instead of 5 minutes', () => {
      const { Mistral } = jest.requireMock<{ Mistral: jest.Mock }>(
        '@mistralai/mistralai',
      );
      expect(Mistral).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: 120_000 }),
      );
    });
  });

  describe('OCR flow', () => {
    beforeEach(() => {
      mockClient.files.upload.mockResolvedValue({ id: 'file-123' });
      mockClient.files.delete.mockResolvedValue(undefined);
    });

    it('should run OCR by file id without requesting a signed URL', async () => {
      mockClient.ocr.process.mockResolvedValue({
        pages: [{ markdown: '# Content', index: 0 }],
      });

      const result = await handler.processFile(testFile);

      expect(mockClient.ocr.process).toHaveBeenCalledWith(
        expect.objectContaining({
          document: { type: 'file', fileId: 'file-123' },
        }),
      );
      expect(mockClient.files.getSignedUrl).not.toHaveBeenCalled();
      expect(result.pages).toHaveLength(1);
    });

    it('should retry when OCR cannot see the just-uploaded file yet', async () => {
      const notVisibleYet = createMistralError(
        404,
        '{"detail":"File not found"}',
      );
      mockClient.ocr.process
        .mockRejectedValueOnce(notVisibleYet)
        .mockResolvedValueOnce({
          pages: [{ markdown: '# Content', index: 0 }],
        });

      const result = await handler.processFile(testFile);

      expect(mockClient.ocr.process).toHaveBeenCalledTimes(2);
      expect(result.pages).toHaveLength(1);
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
    beforeEach(() => {
      // Setup upload to succeed — error on OCR process
      mockClient.files.upload.mockResolvedValue({ id: 'file-123' });
      mockClient.files.delete.mockResolvedValue(undefined);
    });

    it('should throw ServiceBusyError when Mistral rate limiting persists past retries', async () => {
      const mistralError = createMistralError(
        429,
        '{"message":"Rate limit exceeded"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        ServiceBusyError,
      );
    });

    it('should throw ServiceBusyError when Mistral returns 502', async () => {
      const mistralError = createMistralError(
        502,
        '{"message":"An invalid response was received from the upstream server"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        ServiceBusyError,
      );
    });

    it('should throw ServiceBusyError when Mistral returns 503', async () => {
      const mistralError = createMistralError(
        503,
        '{"message":"Service temporarily unavailable"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        ServiceBusyError,
      );
    });

    it('should throw ServiceTimeoutError when Mistral returns 504', async () => {
      const mistralError = createMistralError(
        504,
        '{"message":"Gateway timeout"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        ServiceTimeoutError,
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

    it('should throw FileRetrievalFailedError for other Mistral 400 responses', async () => {
      const mistralError = createMistralError(
        400,
        '{"object":"error","message":"File could not be fetched from url","type":"invalid_request_file","code":"3310"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        FileRetrievalFailedError,
      );
    });

    it('should throw FileRetrievalFailedError when the file stays invisible to OCR after retries', async () => {
      const mistralError = createMistralError(
        404,
        '{"detail":"File not found"}',
      );
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        FileRetrievalFailedError,
      );
    });

    it('should throw FileRetrieverUnexpectedError for non-Mistral errors', async () => {
      mockClient.ocr.process.mockRejectedValue(
        new Error('Network connection lost'),
      );

      await expect(handler.processFile(testFile)).rejects.toThrow(
        FileRetrieverUnexpectedError,
      );
    });

    it('should throw ServiceBusyError when file upload returns 502', async () => {
      const mistralError = createMistralError(502, '{"message":"Bad gateway"}');
      mockClient.files.upload.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        ServiceBusyError,
      );
    });
  });
});
