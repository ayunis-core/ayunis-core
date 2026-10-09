import { createLoggerMock } from 'src/common/testing/logger.mock';
import { AnonymizeTextUseCase } from './anonymize-text.use-case';
import { AnonymizeTextCommand } from './anonymize-text.command';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { PiiDetection } from 'src/common/anonymization/domain/pii-detection';
import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';

describe('AnonymizeTextUseCase', () => {
  let useCase: AnonymizeTextUseCase;
  let detect: jest.Mock;
  const logger = createLoggerMock();

  beforeEach(() => {
    detect = jest.fn();
    logger.log.mockReset();
    logger.error.mockReset();
    useCase = new AnonymizeTextUseCase({ detect });
  });

  const text = 'Ich bin der Dani, erreichbar unter amt32@stadt-marl.de';
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
      entityType: 'EMAIL_ADDRESS',
      category: PiiCategory.EMAIL_ADDRESS,
      text: 'amt32@stadt-marl.de',
      start: 35,
      end: 54,
      score: 0.95,
    },
  ];

  it('anonymizes all detections when no whitelist is given', async () => {
    detect.mockResolvedValue(detections);

    const result = await useCase.execute(new AnonymizeTextCommand(text));

    expect(result.anonymizedText).toBe(
      'Ich bin der [PERSON], erreichbar unter [EMAIL_ADDRESS]',
    );
    expect(result.replacements).toHaveLength(2);
    expect(result.replacements[0]).toMatchObject({
      entityType: 'PERSON',
      category: PiiCategory.PERSON_NAME,
      originalValue: 'Dani',
    });
  });

  it('keeps whitelisted categories unmasked', async () => {
    detect.mockResolvedValue(detections);
    const whitelist = [new PiiWhitelistEntry(PiiCategory.EMAIL_ADDRESS, null)];

    const result = await useCase.execute(
      new AnonymizeTextCommand(text, undefined, whitelist),
    );

    expect(result.anonymizedText).toBe(
      'Ich bin der [PERSON], erreichbar unter amt32@stadt-marl.de',
    );
    expect(result.replacements).toHaveLength(1);
  });

  it('passes the requested entity types through to the engine', async () => {
    detect.mockResolvedValue([]);

    await useCase.execute(new AnonymizeTextCommand(text, ['PERSON']));

    expect(detect).toHaveBeenCalledWith(text, ['PERSON']);
  });

  it('produces legacy placeholders and no new masks without existingMasks', async () => {
    detect.mockResolvedValue(detections);

    const result = await useCase.execute(new AnonymizeTextCommand(text));

    expect(result.anonymizedText).toBe(
      'Ich bin der [PERSON], erreichbar unter [EMAIL_ADDRESS]',
    );
    expect(result.newMasks).toEqual([]);
  });

  it('produces numbered mask tokens when existingMasks is given', async () => {
    detect.mockResolvedValue(detections);

    const result = await useCase.execute(
      new AnonymizeTextCommand(text, undefined, undefined, []),
    );

    expect(result.anonymizedText).toBe(
      'Ich bin der {{pii:PERSON_NAME_1}}, erreichbar unter {{pii:EMAIL_ADDRESS_1}}',
    );
    expect(result.newMasks).toEqual([
      {
        category: PiiCategory.PERSON_NAME,
        maskIndex: 1,
        value: 'Dani',
      },
      {
        category: PiiCategory.EMAIL_ADDRESS,
        maskIndex: 1,
        value: 'amt32@stadt-marl.de',
      },
    ]);
  });

  it('reuses existing masks and applies the whitelist before masking', async () => {
    detect.mockResolvedValue(detections);
    const whitelist = [new PiiWhitelistEntry(PiiCategory.EMAIL_ADDRESS, null)];
    const existingMasks = [
      { category: PiiCategory.PERSON_NAME, maskIndex: 1, value: 'Dani' },
    ];

    const result = await useCase.execute(
      new AnonymizeTextCommand(text, undefined, whitelist, existingMasks),
    );

    expect(result.anonymizedText).toBe(
      'Ich bin der {{pii:PERSON_NAME_1}}, erreichbar unter amt32@stadt-marl.de',
    );
    expect(result.newMasks).toEqual([]);
  });

  it('classifies mask application failures without exposing detected text', async () => {
    detect.mockResolvedValue([
      {
        ...detections[0],
        category: undefined,
        text: 'sensitive value',
      },
    ]);

    const result = useCase.execute(
      new AnonymizeTextCommand(text, undefined, undefined, []),
    );

    await expect(result).rejects.toMatchObject({
      name: 'ANONYMIZATION_MASK_APPLICATION_FAILED',
      code: 'ANONYMIZATION_MASK_APPLICATION_FAILED',
      metadata: {
        stage: 'mask_application',
        textLength: text.length,
        detectionCount: 1,
        causeType: 'TypeError',
      },
    });
    await expect(result).rejects.not.toMatchObject({
      metadata: expect.objectContaining({
        originalError: expect.stringContaining('sensitive value'),
      }),
    });
    expect(logger.error).toHaveBeenCalledWith(
      {
        errorCode: 'ANONYMIZATION_MASK_APPLICATION_FAILED',
        stage: 'mask_application',
        textLength: text.length,
        detectionCount: 1,
        causeType: 'TypeError',
      },
      'Anonymization failed after detection',
    );
  });

  it('classifies whitelist filtering failures without exposing detected text', async () => {
    detect.mockResolvedValue(detections);
    const malformedWhitelist = [undefined] as unknown as PiiWhitelistEntry[];

    const result = useCase.execute(
      new AnonymizeTextCommand(text, undefined, malformedWhitelist),
    );

    await expect(result).rejects.toMatchObject({
      name: 'ANONYMIZATION_WHITELIST_FILTER_FAILED',
      code: 'ANONYMIZATION_WHITELIST_FILTER_FAILED',
      metadata: {
        stage: 'whitelist_filter',
        textLength: text.length,
        detectionCount: detections.length,
        causeType: 'TypeError',
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      {
        errorCode: 'ANONYMIZATION_WHITELIST_FILTER_FAILED',
        stage: 'whitelist_filter',
        textLength: text.length,
        detectionCount: detections.length,
        causeType: 'TypeError',
      },
      'Anonymization failed after detection',
    );
  });
});
