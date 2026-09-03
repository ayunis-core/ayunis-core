import { randomUUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import type { GlobalAnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/global-anonymization-whitelist.repository';
import {
  DuplicateGlobalWhitelistWordError,
  EmptyGlobalWhitelistWordError,
} from 'src/domain/anonymization-settings/application/anonymization-settings.errors';
import { AddGlobalPiiWhitelistWordCommand } from './add-global-pii-whitelist-word.command';
import { AddGlobalPiiWhitelistWordUseCase } from './add-global-pii-whitelist-word.use-case';

describe('AddGlobalPiiWhitelistWordUseCase', () => {
  const repository: jest.Mocked<GlobalAnonymizationWhitelistRepository> = {
    findAll: jest.fn(),
    findByCategoryAndWord: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new AddGlobalPiiWhitelistWordUseCase(repository);
  const superAdminId = randomUUID();

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findByCategoryAndWord.mockResolvedValue(null);
    repository.create.mockImplementation((word) => Promise.resolve(word));
  });

  it('should persist a trimmed word with the acting super admin as author', async () => {
    const result = await useCase.execute(
      new AddGlobalPiiWhitelistWordCommand(
        PiiCategory.PERSON_NAME,
        '  Mitarbeitende  ',
        superAdminId,
      ),
    );

    expect(result.word).toBe('Mitarbeitende');
    expect(result.category).toBe(PiiCategory.PERSON_NAME);
    expect(result.createdByUserId).toBe(superAdminId);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('should reject a word that is empty after trimming', async () => {
    await expect(
      useCase.execute(
        new AddGlobalPiiWhitelistWordCommand(
          PiiCategory.PERSON_NAME,
          '   ',
          superAdminId,
        ),
      ),
    ).rejects.toBeInstanceOf(EmptyGlobalWhitelistWordError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should reject a duplicate word within the same category case-insensitively', async () => {
    repository.findByCategoryAndWord.mockResolvedValue(
      new GlobalAnonymizationWhitelistWord({
        category: PiiCategory.PERSON_NAME,
        word: 'Wir',
        createdByUserId: null,
      }),
    );

    await expect(
      useCase.execute(
        new AddGlobalPiiWhitelistWordCommand(
          PiiCategory.PERSON_NAME,
          'wir',
          superAdminId,
        ),
      ),
    ).rejects.toBeInstanceOf(DuplicateGlobalWhitelistWordError);
    expect(repository.findByCategoryAndWord).toHaveBeenCalledWith(
      PiiCategory.PERSON_NAME,
      'wir',
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should allow the same word in a different category', async () => {
    const result = await useCase.execute(
      new AddGlobalPiiWhitelistWordCommand(
        PiiCategory.ORGANIZATION,
        'Wir',
        superAdminId,
      ),
    );

    expect(result.category).toBe(PiiCategory.ORGANIZATION);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});
