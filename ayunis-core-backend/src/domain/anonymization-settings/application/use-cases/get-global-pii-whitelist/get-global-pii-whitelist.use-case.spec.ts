import { randomUUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import type { GlobalAnonymizationWhitelistRepository } from 'src/domain/anonymization-settings/application/ports/global-anonymization-whitelist.repository';
import { UnexpectedGlobalAnonymizationWhitelistError } from 'src/domain/anonymization-settings/application/anonymization-settings.errors';
import { GetGlobalPiiWhitelistUseCase } from './get-global-pii-whitelist.use-case';

describe('GetGlobalPiiWhitelistUseCase', () => {
  const repository: jest.Mocked<GlobalAnonymizationWhitelistRepository> = {
    findAll: jest.fn(),
    findByCategoryAndWord: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new GetGlobalPiiWhitelistUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all global whitelist words', async () => {
    const words = [
      new GlobalAnonymizationWhitelistWord({
        category: PiiCategory.PERSON_NAME,
        word: 'Mitarbeitende',
        createdByUserId: randomUUID(),
      }),
      new GlobalAnonymizationWhitelistWord({
        category: PiiCategory.ORGANIZATION,
        word: 'Stadtverwaltung',
        createdByUserId: null,
      }),
    ];
    repository.findAll.mockResolvedValue(words);

    await expect(useCase.execute()).resolves.toEqual(words);
  });

  it('should wrap repository failures in the module unexpected error', async () => {
    repository.findAll.mockRejectedValue(new Error('connection refused'));

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedGlobalAnonymizationWhitelistError,
    );
  });
});
