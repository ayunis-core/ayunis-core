import { Logger } from '@nestjs/common';
import { AnonymizeTextUseCase } from './anonymize-text.use-case';
import { AnonymizeTextCommand } from './anonymize-text.command';
import { PiiCategory } from '../../../domain/pii-category.enum';
import type { PiiDetection } from '../../../domain/pii-detection';
import { PiiWhitelistEntry } from '../../../domain/pii-whitelist-entry';

describe('AnonymizeTextUseCase', () => {
  let useCase: AnonymizeTextUseCase;
  let detect: jest.Mock;

  beforeEach(() => {
    detect = jest.fn();
    useCase = new AnonymizeTextUseCase({ detect });
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
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
});
