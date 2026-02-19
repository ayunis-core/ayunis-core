import { GetUserSystemPromptUseCase } from './get-user-system-prompt.use-case';
import type { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { UserSystemPrompt } from '../../../domain/user-system-prompt.entity';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';

describe('GetUserSystemPromptUseCase', () => {
  let useCase: GetUserSystemPromptUseCase;
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

    useCase = new GetUserSystemPromptUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should return the user system prompt when it exists', async () => {
    const existingPrompt = new UserSystemPrompt({
      userId,
      systemPrompt: 'Always respond in bullet points.',
    });
    repository.findByUserId.mockResolvedValue(existingPrompt);

    const result = await useCase.execute();

    expect(result).toEqual(existingPrompt);
    expect(repository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('should return null when no system prompt exists for the user', async () => {
    repository.findByUserId.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toBeNull();
    expect(repository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('should get the userId from the context service', async () => {
    repository.findByUserId.mockResolvedValue(null);

    await useCase.execute();

    expect(contextService.get).toHaveBeenCalledWith('userId');
  });
});
