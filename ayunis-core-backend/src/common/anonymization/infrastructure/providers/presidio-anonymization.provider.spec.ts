import { Logger } from '@nestjs/common';
import { PresidioAnonymizationProvider } from './presidio-anonymization.provider';
import { PiiCategory } from '../../domain/pii-category.enum';
import { AnonymizationFailedError } from '../../application/anonymization.errors';
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

  beforeEach(() => {
    provider = new PresidioAnonymizationProvider();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
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

  it('leaves the category undefined for unmapped entity types', async () => {
    const text = 'mein Geheimnis: hunter2';
    mockResults([
      { entity_type: 'FUTURE_SECRET_TYPE', start: 16, end: 23, score: 0.8 },
    ]);

    const detections = await provider.detect(text);

    expect(detections[0].category).toBeUndefined();
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

  it('returns no detections when the service finds no entities', async () => {
    mockResults([]);

    const detections = await provider.detect(
      'Der Wetterbericht für morgen sagt Regen voraus',
    );

    expect(detections).toHaveLength(0);
  });

  it('throws AnonymizationFailedError when the service call fails', async () => {
    mockAnalyzeTextAnalyzePost.mockRejectedValue(
      new Error('connect ECONNREFUSED'),
    );

    await expect(provider.detect('Ich bin der Dani')).rejects.toThrow(
      AnonymizationFailedError,
    );
  });
});
