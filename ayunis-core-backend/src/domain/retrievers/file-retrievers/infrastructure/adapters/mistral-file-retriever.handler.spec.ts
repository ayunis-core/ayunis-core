import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MistralFileRetrieverHandler } from './mistral-file-retriever.handler';
import {
  FileRetrieverUnexpectedError,
  ServiceBusyError,
  ServiceTimeoutError,
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

// Mock retryWithBackoff to execute fn directly (no retries in tests)
jest.mock('src/common/util/retryWithBackoff', () => ({
  __esModule: true,
  default: ({ fn }: { fn: () => Promise<unknown> }) => fn(),
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

  describe('transient upstream error handling', () => {
    beforeEach(() => {
      // Setup upload and signedUrl to succeed — error on OCR process
      mockClient.files.upload.mockResolvedValue({ id: 'file-123' });
      mockClient.files.getSignedUrl.mockResolvedValue({
        url: 'https://signed.url',
      });
      mockClient.files.delete.mockResolvedValue(undefined);
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

    it('should throw FileRetrieverUnexpectedError for non-transient Mistral errors', async () => {
      const mistralError = createMistralError(400, '{"message":"Bad request"}');
      mockClient.ocr.process.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toThrow(
        FileRetrieverUnexpectedError,
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
