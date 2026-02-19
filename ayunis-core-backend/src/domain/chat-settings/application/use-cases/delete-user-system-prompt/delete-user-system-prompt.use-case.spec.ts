import { DeleteUserSystemPromptUseCase } from './delete-user-system-prompt.use-case';
import type { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';

describe('DeleteUserSystemPromptUseCase', () => {
  let useCase: DeleteUserSystemPromptUseCase;
  let repository: jest.Mocked<UserSystemPromptsRepository>;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;

  const userId = randomUUID();

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
      upsert: jest.fn(),
      deleteByUserId: jest.fn(),
    } as jest.Mocked<UserSystemPromptsRepository>;

    contextService = {
      get: jest.fn().mockReturnValue(userId),
    };

    useCase = new DeleteUserSystemPromptUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should call deleteByUserId with userId from context', async () => {
    repository.deleteByUserId.mockResolvedValue();

    await useCase.execute();

    expect(repository.deleteByUserId).toHaveBeenCalledWith(userId);
    expect(contextService.get).toHaveBeenCalledWith('userId');
  });

  it('should not throw when no system prompt exists for the user', async () => {
    repository.deleteByUserId.mockResolvedValue();

    await expect(useCase.execute()).resolves.not.toThrow();
  });
});
