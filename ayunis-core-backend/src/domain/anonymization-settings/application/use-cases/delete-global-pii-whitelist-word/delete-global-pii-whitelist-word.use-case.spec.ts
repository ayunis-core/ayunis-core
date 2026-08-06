import { randomUUID } from 'crypto';
import type { GlobalAnonymizationWhitelistRepository } from '../../ports/global-anonymization-whitelist.repository';
import { GlobalWhitelistWordNotFoundError } from '../../anonymization-settings.errors';
import { DeleteGlobalPiiWhitelistWordCommand } from './delete-global-pii-whitelist-word.command';
import { DeleteGlobalPiiWhitelistWordUseCase } from './delete-global-pii-whitelist-word.use-case';

describe('DeleteGlobalPiiWhitelistWordUseCase', () => {
  const repository: jest.Mocked<GlobalAnonymizationWhitelistRepository> = {
    findAll: jest.fn(),
    findByCategoryAndWord: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  const useCase = new DeleteGlobalPiiWhitelistWordUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete an existing word', async () => {
    const wordId = randomUUID();
    repository.delete.mockResolvedValue(true);

    await expect(
      useCase.execute(new DeleteGlobalPiiWhitelistWordCommand(wordId)),
    ).resolves.toBeUndefined();
    expect(repository.delete).toHaveBeenCalledWith(wordId);
  });

  it('should throw a not-found error for an unknown id', async () => {
    repository.delete.mockResolvedValue(false);

    await expect(
      useCase.execute(new DeleteGlobalPiiWhitelistWordCommand(randomUUID())),
    ).rejects.toBeInstanceOf(GlobalWhitelistWordNotFoundError);
  });
});
