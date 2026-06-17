import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { AnonymizeTextForOrgUseCase } from './anonymize-text-for-org.use-case';
import { AnonymizeTextForOrgCommand } from './anonymize-text-for-org.command';
import type { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import { AnonymizationWhitelistEntry } from '../../../domain/anonymization-whitelist-entry.entity';
import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';

describe('AnonymizeTextForOrgUseCase', () => {
  const orgId = '0d4f9c5e-7a36-4b34-9c1b-2f8d6a1e5b3c' as UUID;
  const text = 'Ich bin der Dani aus Marl';
  let useCase: AnonymizeTextForOrgUseCase;
  let findByOrgId: jest.Mock;
  let anonymizeExecute: jest.Mock;

  beforeEach(() => {
    findByOrgId = jest.fn().mockResolvedValue([]);
    anonymizeExecute = jest.fn().mockResolvedValue({
      originalText: text,
      anonymizedText: 'Ich bin der [PERSON] aus [LOCATION]',
      replacements: [],
    });
    useCase = new AnonymizeTextForOrgUseCase(
      {
        findByOrgId,
        replaceForOrg: jest.fn(),
      },
      { execute: anonymizeExecute } as unknown as AnonymizeTextUseCase,
    );
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('passes the org whitelist to the anonymization use case', async () => {
    findByOrgId.mockResolvedValue([
      new AnonymizationWhitelistEntry({
        orgId,
        category: PiiCategory.LOCATION,
        pattern: null,
      }),
      new AnonymizationWhitelistEntry({
        orgId,
        category: PiiCategory.PERSON_NAME,
        pattern: 'dani(el)?',
      }),
    ]);

    await useCase.execute(new AnonymizeTextForOrgCommand(text, orgId));

    expect(anonymizeExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        text,
        whitelist: [
          new PiiWhitelistEntry(PiiCategory.LOCATION, null),
          new PiiWhitelistEntry(PiiCategory.PERSON_NAME, 'dani(el)?'),
        ],
      }),
    );
  });

  it('delegates with an empty whitelist when the org has no entries', async () => {
    const result = await useCase.execute(
      new AnonymizeTextForOrgCommand(text, orgId),
    );

    expect(anonymizeExecute).toHaveBeenCalledWith(
      expect.objectContaining({ text, whitelist: [] }),
    );
    expect(result.anonymizedText).toBe('Ich bin der [PERSON] aus [LOCATION]');
  });

  it('propagates engine failures unchanged for fail-safe handling', async () => {
    anonymizeExecute.mockRejectedValue(
      new AnonymizationFailedError('connect ECONNREFUSED'),
    );

    await expect(
      useCase.execute(new AnonymizeTextForOrgCommand(text, orgId)),
    ).rejects.toThrow(AnonymizationFailedError);
  });
});
