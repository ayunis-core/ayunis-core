import { randomUUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import type { GlobalAnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/global-anonymization-whitelist.repository';
import { EmptyGlobalWhitelistWordError } from 'src/domain/anonymization-settings/application/anonymization-settings.errors';
import { AddGlobalPiiWhitelistWordsCommand } from './add-global-pii-whitelist-words.command';
import { AddGlobalPiiWhitelistWordsUseCase } from './add-global-pii-whitelist-words.use-case';

describe('AddGlobalPiiWhitelistWordsUseCase', () => {
  const repository: jest.Mocked<GlobalAnonymizationWhitelistRepository> = {
    findAll: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new AddGlobalPiiWhitelistWordsUseCase(repository);
  const superAdminId = randomUUID();

  beforeEach(() => {
    jest.clearAllMocks();
    repository.createMany.mockImplementation((words) => Promise.resolve(words));
  });

  function execute(words: string[], category = PiiCategory.PERSON_NAME) {
    return useCase.execute(
      new AddGlobalPiiWhitelistWordsCommand(category, words, superAdminId),
    );
  }

  it('should persist every word with the acting super admin as author', async () => {
    const result = await execute(['  Mitarbeitende  ', 'Bürgeramt']);

    expect(result.added.map((word) => word.word)).toEqual([
      'Mitarbeitende',
      'Bürgeramt',
    ]);
    expect(
      result.added.every(
        (word) =>
          word.createdByUserId === superAdminId &&
          word.category === PiiCategory.PERSON_NAME,
      ),
    ).toBe(true);
    expect(result.duplicates).toEqual([]);
    expect(repository.createMany).toHaveBeenCalledTimes(1);
  });

  it('should drop blank entries and keep the first casing of repeated words', async () => {
    const result = await execute(['Wir', '   ', 'wir', 'Uns']);

    expect(result.added.map((word) => word.word)).toEqual(['Wir', 'Uns']);
  });

  it('should report words the repository skipped as duplicates', async () => {
    repository.createMany.mockResolvedValue([
      new GlobalAnonymizationWhitelistWord({
        category: PiiCategory.PERSON_NAME,
        word: 'Uns',
        createdByUserId: superAdminId,
      }),
    ]);

    const result = await execute(['Wir', 'Uns']);

    expect(result.added.map((word) => word.word)).toEqual(['Uns']);
    expect(result.duplicates).toEqual(['Wir']);
  });

  it('should reject a request whose words are all empty after trimming', async () => {
    await expect(execute(['   ', ''])).rejects.toBeInstanceOf(
      EmptyGlobalWhitelistWordError,
    );
    expect(repository.createMany).not.toHaveBeenCalled();
  });
});
