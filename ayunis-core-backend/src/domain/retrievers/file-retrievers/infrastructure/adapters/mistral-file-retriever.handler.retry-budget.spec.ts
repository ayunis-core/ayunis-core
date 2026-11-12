import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MistralError,
  RequestTimeoutError,
} from '@mistralai/mistralai/models/errors';
import {
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { MistralFileRetrieverHandler } from './mistral-file-retriever.handler';

jest.mock('@mistralai/mistralai', () => ({ Mistral: jest.fn() }));

type Answer = 'silence' | 'unavailable' | 'pages';

function unavailable(): MistralError {
  return new MistralError('API error: 503', {
    response: {
      status: 503,
      headers: new Headers({ 'content-type': 'application/json' }),
      url: 'https://api.mistral.ai/v1/ocr',
    } as unknown as Response,
    request: {} as Request,
    body: '{"message":"Service unavailable"}',
  });
}

describe('Mistral OCR retry budget', () => {
  let answers: Answer[];
  let attempts: number;

  // Stands in for the SDK: a silent connection ends only through the timeout
  // the client was constructed with. The last answer repeats.
  function answer(timeoutMs: number): Promise<unknown> {
    const next = answers[Math.min(attempts, answers.length - 1)];
    attempts++;
    if (next === 'unavailable') return Promise.reject(unavailable());
    if (next === 'pages')
      return Promise.resolve({ pages: [{ markdown: 'Minutes', index: 0 }] });
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new RequestTimeoutError('Request timed out')),
        timeoutMs,
      ),
    );
  }

  async function runBatch() {
    const handler = new MistralFileRetrieverHandler(
      new ConfigService({ retrieval: { mistral: { apiKey: 'test-only' } } }),
    );
    const startedAt = Date.now();
    const seconds = () => (Date.now() - startedAt) / 1000;
    const outcome = handler
      .processFile(
        new File(Buffer.from('%PDF-1.7'), 'minutes.pdf', 'application/pdf'),
      )
      .then(
        (result) => ({ result, error: undefined, seconds: seconds() }),
        (error: unknown) => ({ result: undefined, error, seconds: seconds() }),
      );
    await jest.runAllTimersAsync();
    return outcome;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    attempts = 0;
    jest
      .requireMock<{ Mistral: jest.Mock }>('@mistralai/mistralai')
      .Mistral.mockImplementation(({ timeoutMs }: { timeoutMs: number }) => ({
        ocr: { process: () => answer(timeoutMs) },
      }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('fails a batch within about four minutes when the provider never answers', async () => {
    answers = ['silence'];

    const { error, seconds } = await runBatch();

    expect(error).toBeInstanceOf(ProviderTimeoutError);
    expect(attempts).toBe(2);
    expect(seconds).toBeLessThanOrEqual(245);
  });

  it('fails a batch within about four minutes when the provider answers 503 and then goes silent', async () => {
    answers = ['unavailable', 'silence'];

    const { error, seconds } = await runBatch();

    expect(error).toBeInstanceOf(ProviderTimeoutError);
    expect(seconds).toBeLessThanOrEqual(250);
  });

  it('still retries quick failures three times before giving up', async () => {
    answers = ['unavailable'];

    const { error, seconds } = await runBatch();

    expect(error).toBeInstanceOf(ProviderServerError);
    expect(attempts).toBe(4);
    expect(seconds).toBe(7);
  });

  it('recovers when the provider answers again after quick failures', async () => {
    answers = ['unavailable', 'unavailable', 'unavailable', 'pages'];

    const { result } = await runBatch();

    expect(result?.pages.map((page) => page.text)).toEqual(['Minutes']);
  });
});
