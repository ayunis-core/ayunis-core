import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MistralFileRetrieverHandler } from './mistral-file-retriever.handler';
import { FileRetrieverUnexpectedError } from '../../application/file-retriever.errors';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
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

  describe('transient upstream error handling', () => {
    beforeEach(() => {
      // Setup upload and signedUrl to succeed — error on OCR process
      mockClient.files.upload.mockResolvedValue({ id: 'file-123' });
      mockClient.files.getSignedUrl.mockResolvedValue({
        url: 'https://signed.url',
      });
      mockClient.files.delete.mockResolvedValue(undefined);
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
        '{"message":"Unauthorized"}',
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

    it('throws FileRetrieverUnexpectedError for non-Mistral errors', async () => {
      mockClient.ocr.process.mockRejectedValue(
        new Error('cannot read properties of undefined'),
      );

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        FileRetrieverUnexpectedError,
      );
    });

    it('throws ProviderServerError when file upload returns 502', async () => {
      const mistralError = createMistralError(502, '{"message":"Bad gateway"}');
      mockClient.files.upload.mockRejectedValue(mistralError);

      await expect(handler.processFile(testFile)).rejects.toBeInstanceOf(
        ProviderServerError,
      );
    });
  });
});
