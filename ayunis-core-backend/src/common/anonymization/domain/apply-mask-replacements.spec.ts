import { applyMaskReplacements } from './apply-mask-replacements';
import type { PiiMask } from './pii-mask';
import { formatPiiToken } from './pii-mask';
import { PiiCategory } from './pii-category.enum';
import type { PiiDetection } from './pii-detection';

function detection(
  text: string,
  value: string,
  category: PiiCategory,
  start: number,
): PiiDetection {
  return {
    entityType: 'TEST',
    category,
    text: value,
    start,
    end: start + value.length,
    score: 0.9,
  };
}

describe('formatPiiToken', () => {
  it('formats the category uppercased with the mask index', () => {
    expect(
      formatPiiToken({ category: PiiCategory.PERSON_NAME, maskIndex: 1 }),
    ).toBe('{{pii:PERSON_NAME_1}}');
  });
});

describe('applyMaskReplacements', () => {
  it('returns the original text and no new masks when there are no detections', () => {
    const result = applyMaskReplacements('Hallo Welt', [], []);

    expect(result.anonymizedText).toBe('Hallo Welt');
    expect(result.newMasks).toEqual([]);
  });

  it('replaces the first value of a category with index 1', () => {
    const text = 'Ich bin der Dani';
    const result = applyMaskReplacements(
      text,
      [detection(text, 'Dani', PiiCategory.PERSON_NAME, 12)],
      [],
    );

    expect(result.anonymizedText).toBe('Ich bin der {{pii:PERSON_NAME_1}}');
    expect(result.newMasks).toEqual([
      { category: PiiCategory.PERSON_NAME, maskIndex: 1, value: 'Dani' },
    ]);
  });

  it('reuses one token for a repeated value within the same text', () => {
    const text = 'Dani hier, schreib an Dani';
    const result = applyMaskReplacements(
      text,
      [
        detection(text, 'Dani', PiiCategory.PERSON_NAME, 0),
        detection(text, 'Dani', PiiCategory.PERSON_NAME, 22),
      ],
      [],
    );

    expect(result.anonymizedText).toBe(
      '{{pii:PERSON_NAME_1}} hier, schreib an {{pii:PERSON_NAME_1}}',
    );
    expect(result.newMasks).toHaveLength(1);
  });

  it('reuses an existing mask for a value seen in an earlier message', () => {
    const text = 'Gruß an Dani';
    const existing: PiiMask[] = [
      { category: PiiCategory.PERSON_NAME, maskIndex: 1, value: 'Dani' },
    ];
    const result = applyMaskReplacements(
      text,
      [detection(text, 'Dani', PiiCategory.PERSON_NAME, 8)],
      existing,
    );

    expect(result.anonymizedText).toBe('Gruß an {{pii:PERSON_NAME_1}}');
    expect(result.newMasks).toEqual([]);
  });

  it('continues numbering from the highest existing index per category', () => {
    const text = 'Gruß an Max';
    const existing: PiiMask[] = [
      { category: PiiCategory.PERSON_NAME, maskIndex: 1, value: 'Dani' },
      { category: PiiCategory.PERSON_NAME, maskIndex: 2, value: 'Moritz' },
      { category: PiiCategory.EMAIL_ADDRESS, maskIndex: 1, value: 'a@b.de' },
    ];
    const result = applyMaskReplacements(
      text,
      [detection(text, 'Max', PiiCategory.PERSON_NAME, 8)],
      existing,
    );

    expect(result.anonymizedText).toBe('Gruß an {{pii:PERSON_NAME_3}}');
    expect(result.newMasks).toEqual([
      { category: PiiCategory.PERSON_NAME, maskIndex: 3, value: 'Max' },
    ]);
  });

  it('assigns distinct tokens to the same value under different categories', () => {
    const text = 'Berlin und Berlin';
    const result = applyMaskReplacements(
      text,
      [
        detection(text, 'Berlin', PiiCategory.PERSON_NAME, 0),
        detection(text, 'Berlin', PiiCategory.LOCATION, 11),
      ],
      [],
    );

    expect(result.anonymizedText).toBe(
      '{{pii:PERSON_NAME_1}} und {{pii:LOCATION_1}}',
    );
    expect(result.newMasks).toHaveLength(2);
  });

  it('masks unmapped engine types under the OTHER category', () => {
    const text = 'Code X17B';
    const result = applyMaskReplacements(
      text,
      [detection(text, 'X17B', PiiCategory.OTHER, 5)],
      [],
    );

    expect(result.anonymizedText).toBe('Code {{pii:OTHER_1}}');
  });

  it('preserves offsets when replacing multiple detections across categories', () => {
    const text = 'Dani wohnt in Deisenhofen und mailt über dani@example.com';
    const result = applyMaskReplacements(
      text,
      [
        detection(text, 'Dani', PiiCategory.PERSON_NAME, 0),
        detection(text, 'Deisenhofen', PiiCategory.LOCATION, 14),
        detection(text, 'dani@example.com', PiiCategory.EMAIL_ADDRESS, 41),
      ],
      [],
    );

    expect(result.anonymizedText).toBe(
      '{{pii:PERSON_NAME_1}} wohnt in {{pii:LOCATION_1}} und mailt über {{pii:EMAIL_ADDRESS_1}}',
    );
    expect(result.newMasks).toHaveLength(3);
  });
});
