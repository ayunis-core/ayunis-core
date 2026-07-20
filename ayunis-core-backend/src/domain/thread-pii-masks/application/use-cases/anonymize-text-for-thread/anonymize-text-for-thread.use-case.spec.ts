import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { AnonymizeTextForThreadUseCase } from './anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from './anonymize-text-for-thread.command';
import type { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import type { GetPiiWhitelistUseCase } from 'src/domain/anonymization-settings/application/use-cases/get-pii-whitelist/get-pii-whitelist.use-case';
import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { PiiWhitelistEntry } from 'src/common/anonymization/domain/pii-whitelist-entry';
import { AnonymizationWhitelistEntry } from 'src/domain/anonymization-settings/domain/anonymization-whitelist-entry.entity';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { UnexpectedThreadPiiMasksError } from '../../thread-pii-masks.errors';

describe('AnonymizeTextForThreadUseCase', () => {
  const orgId = '0d4f9c5e-7a36-4b34-9c1b-2f8d6a1e5b3c' as UUID;
  const threadId = '7b1f2a3c-4d5e-6f70-8192-a3b4c5d6e7f8' as UUID;
  const text = 'Ich bin der Dani';
  let useCase: AnonymizeTextForThreadUseCase;
  let findByThreadId: jest.Mock;
  let saveMany: jest.Mock;
  let whitelistExecute: jest.Mock;
  let anonymizeExecute: jest.Mock;

  beforeEach(() => {
    findByThreadId = jest.fn().mockResolvedValue([]);
    saveMany = jest.fn().mockResolvedValue(undefined);
    whitelistExecute = jest.fn().mockResolvedValue([]);
    anonymizeExecute = jest.fn().mockResolvedValue({
      originalText: text,
      anonymizedText: 'Ich bin der {{pii:PERSON_NAME_1}}',
      replacements: [],
      newMasks: [
        { category: PiiCategory.PERSON_NAME, maskIndex: 1, value: 'Dani' },
      ],
    });
    useCase = new AnonymizeTextForThreadUseCase(
      { findByThreadId, saveMany },
      { execute: whitelistExecute } as unknown as GetPiiWhitelistUseCase,
      { execute: anonymizeExecute } as unknown as AnonymizeTextUseCase,
    );
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  const command = () =>
    new AnonymizeTextForThreadCommand(text, orgId, threadId);

  it('passes the org whitelist and existing thread masks to anonymization', async () => {
    whitelistExecute.mockResolvedValue([
      new AnonymizationWhitelistEntry({
        orgId,
        category: PiiCategory.LOCATION,
        pattern: null,
      }),
    ]);
    const existing = new ThreadPiiMask({
      threadId,
      category: PiiCategory.PERSON_NAME,
      maskIndex: 1,
      value: 'Moritz',
    });
    findByThreadId.mockResolvedValue([existing]);

    await useCase.execute(command());

    expect(anonymizeExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        text,
        whitelist: [new PiiWhitelistEntry(PiiCategory.LOCATION, null)],
        existingMasks: [
          {
            category: PiiCategory.PERSON_NAME,
            maskIndex: 1,
            value: 'Moritz',
          },
        ],
      }),
    );
  });

  it('persists only the newly created masks before returning', async () => {
    await useCase.execute(command());

    expect(saveMany).toHaveBeenCalledTimes(1);
    const saved = (saveMany.mock.calls[0] as [ThreadPiiMask[]])[0];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      threadId,
      category: PiiCategory.PERSON_NAME,
      maskIndex: 1,
      value: 'Dani',
    });
  });

  it('does not persist when no new masks were created', async () => {
    anonymizeExecute.mockResolvedValue({
      originalText: text,
      anonymizedText: text,
      replacements: [],
      newMasks: [],
    });

    await useCase.execute(command());

    expect(saveMany).not.toHaveBeenCalled();
  });

  it('returns the merged mask dictionary of existing and new masks', async () => {
    const existing = new ThreadPiiMask({
      threadId,
      category: PiiCategory.EMAIL_ADDRESS,
      maskIndex: 1,
      value: 'a@b.de',
    });
    findByThreadId.mockResolvedValue([existing]);

    const result = await useCase.execute(command());

    expect(result.anonymizedText).toBe('Ich bin der {{pii:PERSON_NAME_1}}');
    expect(result.masks).toHaveLength(2);
    expect(result.masks[0]).toBe(existing);
    expect(result.masks[1]).toMatchObject({
      threadId,
      category: PiiCategory.PERSON_NAME,
      value: 'Dani',
    });
  });

  it('propagates engine failures unchanged for fail-safe handling', async () => {
    anonymizeExecute.mockRejectedValue(
      new AnonymizationFailedError('connect ECONNREFUSED'),
    );

    await expect(useCase.execute(command())).rejects.toThrow(
      AnonymizationFailedError,
    );
  });

  it('wraps repository failures in a module error', async () => {
    saveMany.mockRejectedValue(new Error('unique constraint violation'));

    await expect(useCase.execute(command())).rejects.toThrow(
      UnexpectedThreadPiiMasksError,
    );
  });
});
