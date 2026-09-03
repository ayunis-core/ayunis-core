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

  it('logs payload size and total client duration after detection', async () => {
    jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(456.78);
    mockResults([]);

    await provider.detect('Der Wetterbericht sagt Regen voraus');

    expect(logger.log).toHaveBeenCalledWith(
      { textLength: 35, detectionCount: 0, durationMs: 356.78 },
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

  it('rejects text beyond the service limit without sending it', async () => {
    const result = provider.detect('A'.repeat(30_001));

    await expect(result).rejects.toMatchObject({
      code: 'ANONYMIZATION_INPUT_TOO_LONG',
      statusCode: 422,
    });
    expect(mockAnalyzeTextAnalyzePost).not.toHaveBeenCalled();
  });

  it('counts Unicode code points like the anonymize service', async () => {
    const text = '😀'.repeat(30_000);
    mockResults([]);

    await expect(provider.detect(text)).resolves.toEqual([]);
    expect(mockAnalyzeTextAnalyzePost).toHaveBeenCalledWith({
      text,
      entities: null,
    });
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

  it('classifies a refused connection under the provider connection taxonomy', async () => {
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8002'), {
        code: 'ECONNREFUSED',
      }),
    );

    await expect(provider.detect('Ich bin der Dani')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_ANONYMIZE',
    });
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
