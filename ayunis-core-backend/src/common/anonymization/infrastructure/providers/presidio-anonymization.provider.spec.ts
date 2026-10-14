import { createLoggerMock } from 'src/common/testing/logger.mock';
import { PresidioAnonymizationProvider } from './presidio-anonymization.provider';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';
import type { RecognizerResult } from 'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI.schemas';

const mockAnalyzeTextAnalyzePost = jest.fn();
jest.mock(
  'src/common/clients/anonymize/generated/mSPresidioPIIDetectionAPI',
  () => ({
    getMSPresidioPIIDetectionAPI: () => ({
      analyzeTextAnalyzePost: mockAnalyzeTextAnalyzePost,
    }),
  }),
);

describe('PresidioAnonymizationProvider', () => {
  let provider: PresidioAnonymizationProvider;
  const logger = createLoggerMock();

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new PresidioAnonymizationProvider();
    mockAnalyzeTextAnalyzePost.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockResults = (results: RecognizerResult[]) => {
    mockAnalyzeTextAnalyzePost.mockResolvedValue({ results });
  };

  it('maps a detected entity to a detection with span text and category', async () => {
    const text = 'Ich bin der Dani';
    mockResults([{ entity_type: 'PERSON', start: 12, end: 16, score: 0.9 }]);

    const detections = await provider.detect(text);

    expect(detections).toEqual([
      {
        entityType: 'PERSON',
        category: PiiCategory.PERSON_NAME,
        text: 'Dani',
        start: 12,
        end: 16,
        score: 0.9,
      },
    ]);
  });

  it('maps Presidio entity types onto the engine-agnostic taxonomy', async () => {
    const text = 'x'.repeat(100);
    mockResults([
      { entity_type: 'URL', start: 0, end: 5, score: 0.9 },
      { entity_type: 'IP_ADDRESS', start: 10, end: 15, score: 0.9 },
      { entity_type: 'IBAN_CODE', start: 20, end: 25, score: 0.9 },
      { entity_type: 'US_SSN', start: 30, end: 35, score: 0.9 },
      { entity_type: 'NRP', start: 40, end: 45, score: 0.9 },
    ]);

    const detections = await provider.detect(text);

    expect(detections.map((d) => d.category)).toEqual([
      PiiCategory.URL_OR_IP,
      PiiCategory.URL_OR_IP,
      PiiCategory.FINANCIAL_ACCOUNT,
      PiiCategory.GOVERNMENT_ID,
      PiiCategory.NATIONALITY_RELIGION_POLITICS,
    ]);
  });

  it('maps unmapped entity types to the OTHER category', async () => {
    const text = 'mein Geheimnis: hunter2';
    mockResults([
      { entity_type: 'FUTURE_SECRET_TYPE', start: 16, end: 23, score: 0.8 },
    ]);

    const detections = await provider.detect(text);

    expect(detections[0].category).toBe(PiiCategory.OTHER);
  });

  it('collapses overlapping spans sharing an end position', async () => {
    const text = 'Ich bin der Dani, ich komm aus Deisenhofen und bin Metzger';
    mockResults([
      { entity_type: 'PERSON', start: 0, end: 16, score: 0.85 },
      { entity_type: 'PERSON', start: 12, end: 16, score: 0.9 },
      { entity_type: 'LOCATION', start: 31, end: 42, score: 0.9 },
    ]);

    const detections = await provider.detect(text);

    expect(detections).toHaveLength(2);
    expect(detections[0]).toMatchObject({ start: 0, end: 16 });
  });

  it('collapses nested spans sharing a start position', async () => {
    const text = 'Berlin University is in Germany';
    mockResults([
      { entity_type: 'LOCATION', start: 0, end: 6, score: 0.8 },
      { entity_type: 'ORGANIZATION', start: 0, end: 17, score: 0.9 },
    ]);

    const detections = await provider.detect(text);

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      entityType: 'ORGANIZATION',
      text: 'Berlin University',
    });
  });

  // A name span over the local part of an email must not swallow the email:
  // the email keeps its exact range, so its mask de-anonymises to the whole
  // address, and the name is trimmed to what lies before it.
  it('keeps the exact email range when a name span crosses it', async () => {
    const text = 'Max Mueller max.mueller@example.org schreibt';
    mockResults([
      { entity_type: 'PERSON', start: 0, end: 23, score: 0.7 },
      { entity_type: 'EMAIL_ADDRESS', start: 12, end: 35, score: 1 },
    ]);

    const detections = await provider.detect(text);

    expect(detections).toEqual([
      expect.objectContaining({
        entityType: 'PERSON',
        text: 'Max Mueller',
        start: 0,
        end: 11,
      }),
      expect.objectContaining({
        entityType: 'EMAIL_ADDRESS',
        text: 'max.mueller@example.org',
        start: 12,
        end: 35,
      }),
    ]);
  });

  it('logs payload size and total client duration after detection', async () => {
    jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(456.78);
    mockResults([]);

    await provider.detect('Der Wetterbericht sagt Regen voraus');

    expect(logger.log).toHaveBeenCalledWith(
      { textLength: 35, chunkCount: 1, detectionCount: 0, durationMs: 356.78 },
      'PII detection complete',
    );
  });

  it('returns no detections when the service finds no entities', async () => {
    mockResults([]);

    const detections = await provider.detect(
      'Der Wetterbericht für morgen sagt Regen voraus',
    );

    expect(detections).toHaveLength(0);
  });

  it('rejects text beyond the input limit without sending it', async () => {
    const result = provider.detect('A'.repeat(30_001));

    await expect(result).rejects.toMatchObject({
      code: 'ANONYMIZATION_INPUT_TOO_LONG',
      statusCode: 422,
    });
    expect(mockAnalyzeTextAnalyzePost).not.toHaveBeenCalled();
  });

  // The anonymizer processes about 3 ms per character, so one request can
  // only finish about 15k characters inside the 60 s timeout. Longer texts are
  // sent as overlapping 5k chunks in parallel, which the service spreads over
  // its workers (AYC-1254).
  it('sends a text at the input limit as overlapping chunks in parallel', async () => {
    const text = 'A'.repeat(30_000);
    mockResults([]);

    await expect(provider.detect(text)).resolves.toEqual([]);

    expect(mockAnalyzeTextAnalyzePost).toHaveBeenCalledTimes(7);
    expect(mockAnalyzeTextAnalyzePost).toHaveBeenNthCalledWith(1, {
      text: 'A'.repeat(5_000),
      entities: null,
    });
    expect(mockAnalyzeTextAnalyzePost).toHaveBeenNthCalledWith(7, {
      text: 'A'.repeat(3_000),
      entities: null,
    });
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ textLength: 30_000, chunkCount: 7 }),
      'PII detection complete',
    );
  });

  it('keeps at most three chunk requests in flight', async () => {
    const text = 'A'.repeat(30_000);
    let started = 0;
    let inFlight = 0;
    let maxInFlight = 0;
    const release: Array<() => void> = [];
    mockAnalyzeTextAnalyzePost.mockImplementation(
      () =>
        new Promise((resolve) => {
          started += 1;
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          release.push(() => {
            inFlight -= 1;
            resolve({ results: [] });
          });
        }),
    );

    const result = provider.detect(text);
    while (started < 7 || release.length > 0) {
      await new Promise((resolve) => setImmediate(resolve));
      release.shift()?.();
    }

    await expect(result).resolves.toEqual([]);
    expect(maxInFlight).toBe(3);
  });

  it('shifts chunk spans to full-text offsets', async () => {
    const text = 'a'.repeat(9_500) + 'Dani' + 'a'.repeat(2_496);
    mockAnalyzeTextAnalyzePost
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({
        results: [{ entity_type: 'PERSON', start: 500, end: 504, score: 0.9 }],
      });

    const detections = await provider.detect(text);

    expect(detections).toEqual([
      expect.objectContaining({ text: 'Dani', start: 9_500, end: 9_504 }),
    ]);
  });

  it('reports an entity straddling a chunk boundary once, with the span the chunk that saw it whole reported', async () => {
    const text = 'a'.repeat(4_995) + 'Hans Müller' + 'a'.repeat(6_994);
    mockAnalyzeTextAnalyzePost
      .mockResolvedValueOnce({
        results: [
          { entity_type: 'PERSON', start: 4_995, end: 5_000, score: 0.8 },
        ],
      })
      .mockResolvedValueOnce({
        results: [{ entity_type: 'PERSON', start: 495, end: 506, score: 0.9 }],
      })
      .mockResolvedValueOnce({ results: [] });

    const detections = await provider.detect(text);

    expect(detections).toEqual([
      expect.objectContaining({
        text: 'Hans Müller',
        start: 4_995,
        end: 5_006,
        score: 0.9,
      }),
    ]);
  });

  // Presidio's URL recognizer matches through the next whitespace, so a long
  // URL can be longer than the overlap and get cut by both chunks: the first
  // chunk reports the prefix up to its cut, the second starts at the
  // whitespace before the URL and reports it whole. The merge unions both.
  it('masks an entity longer than the overlap from the union of both chunks', async () => {
    const url = 'https://example.org/' + 'q'.repeat(680);
    const text = 'a'.repeat(4_399) + ' ' + url + ' ' + 'a'.repeat(6_899);
    mockAnalyzeTextAnalyzePost
      .mockResolvedValueOnce({
        results: [{ entity_type: 'URL', start: 4_400, end: 5_000, score: 0.5 }],
      })
      .mockResolvedValueOnce({
        results: [{ entity_type: 'URL', start: 0, end: 700, score: 0.5 }],
      })
      .mockResolvedValue({ results: [] });

    const detections = await provider.detect(text);

    expect(mockAnalyzeTextAnalyzePost).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ text: expect.stringMatching(/^https:/) }),
    );
    expect(detections).toEqual([
      expect.objectContaining({ text: url, start: 4_400, end: 5_100 }),
    ]);
  });

  // A URL longer than two overlaps starts before the window the next chunk
  // can begin in, so that chunk starts inside the URL and never sees the
  // scheme; it reports nothing. The prefix from the first chunk must still
  // cover the whole token, where presigned-query credentials sit.
  it('masks the tail of a whitespace-free token the next chunk cannot recognise', async () => {
    const url = 'https://example.org/' + 'q'.repeat(1_180);
    const text = 'a'.repeat(3_999) + ' ' + url + ' ' + 'a'.repeat(6_000);
    mockAnalyzeTextAnalyzePost
      .mockResolvedValueOnce({
        results: [{ entity_type: 'URL', start: 4_000, end: 5_000, score: 0.5 }],
      })
      .mockResolvedValue({ results: [] });

    const detections = await provider.detect(text);

    expect(detections).toEqual([
      expect.objectContaining({ text: url, start: 4_000, end: 5_200 }),
    ]);
  });

  it('fails closed when one chunk fails', async () => {
    jest.useFakeTimers();
    const text = 'A'.repeat(4_500) + 'B'.repeat(4_500) + 'C'.repeat(3_000);
    mockAnalyzeTextAnalyzePost.mockImplementation(
      ({ text: chunk }: { text: string }) =>
        chunk.startsWith('B')
          ? Promise.reject(
              Object.assign(new Error('timeout of 60000ms exceeded'), {
                code: 'ETIMEDOUT',
              }),
            )
          : Promise.resolve({ results: [] }),
    );

    const result = provider.detect(text);
    const failure = expect(result).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_TIMEOUT_ANONYMIZE',
    });
    await jest.runAllTimersAsync();

    await failure;
    const chunkTexts = mockAnalyzeTextAnalyzePost.mock.calls.map(
      ([request]: [{ text: string }]) => request.text[0],
    );
    expect(chunkTexts.filter((c) => c === 'B')).toHaveLength(2);
    jest.useRealTimers();
  });

  // Presidio returns Python string indices, which count code points — an emoji
  // is 1 — while substring/slice count UTF-16 code units, where it is 2. Every
  // span after an astral character used to resolve one unit short per emoji,
  // masking the wrong text and storing a mask value that cannot round-trip
  // through de-anonymization (AYC-905).
  it('resolves spans past an emoji using code-point offsets', async () => {
    const text = 'Hi \u{1F600} ich bin der Dani';
    mockResults([{ entity_type: 'PERSON', start: 17, end: 21, score: 0.9 }]);

    const detections = await provider.detect(text);

    expect(detections[0]).toMatchObject({ text: 'Dani', start: 18, end: 22 });
  });

  it('leaves spans before any astral character untouched', async () => {
    const text = 'Dani schrieb \u{1F600}';
    mockResults([{ entity_type: 'PERSON', start: 0, end: 4, score: 0.9 }]);

    const detections = await provider.detect(text);

    expect(detections[0]).toMatchObject({ text: 'Dani', start: 0, end: 4 });
  });

  it('counts Unicode code points like the anonymize service', async () => {
    const text = '😀'.repeat(30_000);
    mockResults([]);

    await expect(provider.detect(text)).resolves.toEqual([]);

    const chunkLengths = mockAnalyzeTextAnalyzePost.mock.calls.map(
      ([request]: [{ text: string }]) => Array.from(request.text).length,
    );
    expect(chunkLengths).toHaveLength(7);
    expect(chunkLengths[0]).toBe(5_000);
    expect(Math.max(...chunkLengths)).toBe(5_000);
  });

  it('throws AnonymizationFailedError when the service call fails', async () => {
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      new Error('connect ECONNREFUSED'),
    );

    await expect(provider.detect('Ich bin der Dani')).rejects.toThrow(
      AnonymizationFailedError,
    );
  });

  it('recovers when the first anonymization request times out', async () => {
    jest.useFakeTimers();
    mockAnalyzeTextAnalyzePost
      .mockRejectedValueOnce(
        Object.assign(new Error('timeout of 60000ms exceeded'), {
          code: 'ETIMEDOUT',
        }),
      )
      .mockResolvedValueOnce({ results: [] });

    const result = provider.detect('Ich bin der Dani');
    await jest.runAllTimersAsync();

    await expect(result).resolves.toEqual([]);
    expect(mockAnalyzeTextAnalyzePost).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  // The axios deadline (ETIMEDOUT with clarifyTimeoutError) must group
  // under the stable provider taxonomy instead of a raw axios error, so
  // anonymize outages get one incident with rate alerting (AYC-654).
  it('preserves the provider timeout taxonomy after retry exhaustion', async () => {
    jest.useFakeTimers();
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      Object.assign(new Error('timeout of 60000ms exceeded'), {
        code: 'ETIMEDOUT',
      }),
    );

    const result = provider.detect('Ich bin der Dani');
    const failure = expect(result).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_TIMEOUT_ANONYMIZE',
      statusCode: 504,
    });
    await jest.runAllTimersAsync();

    await failure;
    expect(mockAnalyzeTextAnalyzePost).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it.each(['direct', 'cause', 'aggregate'])(
    'recovers from a refused connection (%s) without losing detection results',
    async (shape) => {
      const refused = Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED',
      });
      const errors: Record<string, Error> = {
        direct: refused,
        cause: new TypeError('fetch failed', { cause: refused }),
        aggregate: new AggregateError([refused]),
      };
      const error = errors[shape];
      mockAnalyzeTextAnalyzePost
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          results: [{ entity_type: 'PERSON', start: 0, end: 4, score: 0.9 }],
        });
      await expect(provider.detect('Dani', ['PERSON'])).resolves.toEqual([
        expect.objectContaining({ text: 'Dani', entityType: 'PERSON' }),
      ]);
      expect(mockAnalyzeTextAnalyzePost).toHaveBeenCalledTimes(2);
      expect(mockAnalyzeTextAnalyzePost).toHaveBeenLastCalledWith({
        text: 'Dani',
        entities: ['PERSON'],
      });
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({ text: expect.anything() }),
        expect.anything(),
      );
    },
  );

  it('classifies a refused connection under the provider connection taxonomy after one retry', async () => {
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8002'), {
        code: 'ECONNREFUSED',
      }),
    );

    await expect(provider.detect('Ich bin der Dani')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_ANONYMIZE',
    });
    expect(mockAnalyzeTextAnalyzePost).toHaveBeenCalledTimes(2);
  });

  it('classifies an upstream 5xx under the provider server taxonomy', async () => {
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 503'), {
        response: { status: 503 },
      }),
    );

    await expect(provider.detect('Ich bin der Dani')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_SERVER_ANONYMIZE',
    });
  });

  it('does not retry certificate failures', async () => {
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      Object.assign(new Error('certificate expired'), {
        code: 'CERT_HAS_EXPIRED',
      }),
    );
    await expect(provider.detect('Dani')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_ANONYMIZE',
    });
    expect(mockAnalyzeTextAnalyzePost).toHaveBeenCalledTimes(1);
  });

  // A remaining 422 means our request shape drifted despite local validation.
  // It must stay a distinct incident rather than blend into the outage taxonomy.
  it('keeps upstream 4xx failures as AnonymizationFailedError', async () => {
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 422'), {
        response: { status: 422 },
      }),
    );

    await expect(provider.detect('Ich bin der Dani')).rejects.toThrow(
      AnonymizationFailedError,
    );
  });
});
