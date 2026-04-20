import { Logger } from '@nestjs/common';
import { PresidioAnonymizationProvider } from './presidio-anonymization.provider';
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

  it('replaces a single detected entity with its type placeholder', async () => {
    const text = 'Ich bin der Dani';
    mockResults([{ entity_type: 'PERSON', start: 12, end: 16, score: 0.9 }]);

    const result = await provider.anonymize(text);

    expect(result.anonymizedText).toBe('Ich bin der [PERSON]');
  });

  it('replaces multiple non-overlapping entities in a single pass', async () => {
    const text = 'Ich bin der Dani, ich komm aus Deisenhofen und bin Metzger';
    mockResults([
      { entity_type: 'PERSON', start: 12, end: 16, score: 0.9 },
      { entity_type: 'LOCATION', start: 31, end: 42, score: 0.9 },
    ]);

    const result = await provider.anonymize(text);

    expect(result.anonymizedText).toBe(
      'Ich bin der [PERSON], ich komm aus [LOCATION] und bin Metzger',
    );
  });

  it('collapses overlapping spans sharing an end position into one replacement', async () => {
    const text = 'Ich bin der Dani, ich komm aus Deisenhofen und bin Metzger';
    mockResults([
      { entity_type: 'PERSON', start: 0, end: 16, score: 0.85 },
      { entity_type: 'PERSON', start: 12, end: 16, score: 0.9 },
      { entity_type: 'LOCATION', start: 31, end: 42, score: 0.9 },
    ]);

    const result = await provider.anonymize(text);

    expect(result.anonymizedText).not.toContain('[PERSON]SON]');
    expect(result.anonymizedText).toBe(
      '[PERSON], ich komm aus [LOCATION] und bin Metzger',
    );
    expect(result.replacements).toHaveLength(2);
  });

  it('collapses nested spans sharing a start position into one replacement', async () => {
    const text = 'Berlin University is in Germany';
    mockResults([
      { entity_type: 'LOCATION', start: 0, end: 6, score: 0.8 },
      { entity_type: 'ORGANIZATION', start: 0, end: 17, score: 0.9 },
    ]);

    const result = await provider.anonymize(text);

    expect(result.anonymizedText).toBe('[ORGANIZATION] is in Germany');
    expect(result.replacements).toHaveLength(1);
  });

  it('returns the original text when no entities are detected', async () => {
    const text = 'Der Wetterbericht für morgen sagt Regen voraus';
    mockResults([]);

    const result = await provider.anonymize(text);

    expect(result.anonymizedText).toBe(text);
    expect(result.replacements).toHaveLength(0);
  });
});
