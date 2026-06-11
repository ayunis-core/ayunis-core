import { filterWhitelistedDetections } from './whitelist-filter';
import { PiiCategory } from './pii-category.enum';
import { PiiWhitelistEntry } from './pii-whitelist-entry';
import type { PiiDetection } from './pii-detection';

function detection(overrides: Partial<PiiDetection>): PiiDetection {
  return {
    entityType: 'PERSON',
    category: PiiCategory.PERSON_NAME,
    text: 'Daniel Benner',
    start: 0,
    end: 13,
    score: 0.9,
    ...overrides,
  };
}

describe('filterWhitelistedDetections', () => {
  it('exempts a detection whose category is whitelisted without a pattern', () => {
    const detections = [
      detection({
        entityType: 'EMAIL_ADDRESS',
        category: PiiCategory.EMAIL_ADDRESS,
        text: 'sachbearbeitung@stadt-marl.de',
      }),
    ];
    const entries = [new PiiWhitelistEntry(PiiCategory.EMAIL_ADDRESS, null)];

    expect(filterWhitelistedDetections(detections, entries)).toHaveLength(0);
  });

  it('keeps detections whose category is not whitelisted', () => {
    const detections = [
      detection({
        entityType: 'PHONE_NUMBER',
        category: PiiCategory.PHONE_NUMBER,
        text: '+49 2365 99-0',
      }),
    ];
    const entries = [new PiiWhitelistEntry(PiiCategory.EMAIL_ADDRESS, null)];

    expect(filterWhitelistedDetections(detections, entries)).toEqual(
      detections,
    );
  });

  it('returns all detections when the whitelist is empty', () => {
    const detections = [detection({})];

    expect(filterWhitelistedDetections(detections, [])).toEqual(detections);
  });

  it('exempts a value that fully matches the pattern', () => {
    const detections = [
      detection({
        entityType: 'EMAIL_ADDRESS',
        category: PiiCategory.EMAIL_ADDRESS,
        text: 'amt32@stadt-marl.de',
      }),
    ];
    const entries = [
      new PiiWhitelistEntry(PiiCategory.EMAIL_ADDRESS, '.*@stadt-marl\\.de'),
    ];

    expect(filterWhitelistedDetections(detections, entries)).toHaveLength(0);
  });

  it('keeps a value that only partially matches the pattern', () => {
    const detections = [
      detection({
        entityType: 'EMAIL_ADDRESS',
        category: PiiCategory.EMAIL_ADDRESS,
        text: 'privat@stadt-marl.de.example.org',
      }),
    ];
    const entries = [
      new PiiWhitelistEntry(PiiCategory.EMAIL_ADDRESS, '.*@stadt-marl\\.de'),
    ];

    expect(filterWhitelistedDetections(detections, entries)).toEqual(
      detections,
    );
  });

  it('matches patterns case-insensitively', () => {
    const detections = [
      detection({
        entityType: 'PERSON',
        category: PiiCategory.PERSON_NAME,
        text: 'DANIEL',
      }),
    ];
    const entries = [
      new PiiWhitelistEntry(PiiCategory.PERSON_NAME, 'dani(el)?'),
    ];

    expect(filterWhitelistedDetections(detections, entries)).toHaveLength(0);
  });

  it('keeps the detection when the stored pattern is not a valid regex', () => {
    const detections = [
      detection({
        entityType: 'PERSON',
        category: PiiCategory.PERSON_NAME,
        text: 'Daniel',
      }),
    ];
    const entries = [new PiiWhitelistEntry(PiiCategory.PERSON_NAME, '([')];

    expect(filterWhitelistedDetections(detections, entries)).toEqual(
      detections,
    );
  });

  it('keeps OTHER detections when only other categories are whitelisted', () => {
    const detections = [
      detection({
        entityType: 'CUSTOM_FUTURE_ENTITY',
        category: PiiCategory.OTHER,
        text: 'irgendein Wert',
      }),
    ];
    const entries = Object.values(PiiCategory)
      .filter((category) => category !== PiiCategory.OTHER)
      .map((category) => new PiiWhitelistEntry(category, null));

    expect(filterWhitelistedDetections(detections, entries)).toEqual(
      detections,
    );
  });

  it('exempts OTHER detections when OTHER is explicitly whitelisted', () => {
    const detections = [
      detection({
        entityType: 'CUSTOM_FUTURE_ENTITY',
        category: PiiCategory.OTHER,
        text: 'irgendein Wert',
      }),
    ];
    const entries = [new PiiWhitelistEntry(PiiCategory.OTHER, null)];

    expect(filterWhitelistedDetections(detections, entries)).toEqual([]);
  });

  it('filters a mixed set of detections independently', () => {
    const exemptByCategory = detection({
      entityType: 'EMAIL_ADDRESS',
      category: PiiCategory.EMAIL_ADDRESS,
      text: 'amt32@stadt-marl.de',
    });
    const exemptByPattern = detection({
      entityType: 'PERSON',
      category: PiiCategory.PERSON_NAME,
      text: 'Daniel',
    });
    const keptWrongPattern = detection({
      entityType: 'PERSON',
      category: PiiCategory.PERSON_NAME,
      text: 'Moritz',
    });
    const keptNoEntry = detection({
      entityType: 'PHONE_NUMBER',
      category: PiiCategory.PHONE_NUMBER,
      text: '+49 2365 99-0',
    });
    const entries = [
      new PiiWhitelistEntry(PiiCategory.EMAIL_ADDRESS, null),
      new PiiWhitelistEntry(PiiCategory.PERSON_NAME, 'dani(el)?'),
    ];

    const result = filterWhitelistedDetections(
      [exemptByCategory, exemptByPattern, keptWrongPattern, keptNoEntry],
      entries,
    );

    expect(result).toEqual([keptWrongPattern, keptNoEntry]);
  });
});
