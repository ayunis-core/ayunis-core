import { applyReplacements } from './apply-replacements';
import { PiiCategory } from './pii-category.enum';
import type { PiiDetection } from './pii-detection';

describe('applyReplacements', () => {
  it('replaces a single detection with its entity type placeholder', () => {
    const text = 'Ich bin der Dani';
    const detections: PiiDetection[] = [
      {
        entityType: 'PERSON',
        category: PiiCategory.PERSON_NAME,
        text: 'Dani',
        start: 12,
        end: 16,
        score: 0.9,
      },
    ];

    expect(applyReplacements(text, detections)).toBe('Ich bin der [PERSON]');
  });

  it('replaces multiple detections while preserving earlier offsets', () => {
    const text = 'Ich bin der Dani, ich komm aus Deisenhofen und bin Metzger';
    const detections: PiiDetection[] = [
      {
        entityType: 'PERSON',
        category: PiiCategory.PERSON_NAME,
        text: 'Dani',
        start: 12,
        end: 16,
        score: 0.9,
      },
      {
        entityType: 'LOCATION',
        category: PiiCategory.LOCATION,
        text: 'Deisenhofen',
        start: 31,
        end: 42,
        score: 0.9,
      },
    ];

    expect(applyReplacements(text, detections)).toBe(
      'Ich bin der [PERSON], ich komm aus [LOCATION] und bin Metzger',
    );
  });

  it('returns the original text when there are no detections', () => {
    const text = 'Der Wetterbericht für morgen sagt Regen voraus';

    expect(applyReplacements(text, [])).toBe(text);
  });
});
