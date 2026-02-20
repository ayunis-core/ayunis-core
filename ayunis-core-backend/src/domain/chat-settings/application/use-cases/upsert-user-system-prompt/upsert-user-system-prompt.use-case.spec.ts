import { UpsertUserSystemPromptUseCase } from './upsert-user-system-prompt.use-case';
import { UpsertUserSystemPromptCommand } from './upsert-user-system-prompt.command';
import type { UserSystemPromptsRepository } from '../../ports/user-system-prompts.repository';
import { UserSystemPrompt } from '../../../domain/user-system-prompt.entity';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';

describe('UpsertUserSystemPromptUseCase', () => {
  let useCase: UpsertUserSystemPromptUseCase;
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

    useCase = new UpsertUserSystemPromptUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should create a new user system prompt and return the result', async () => {
    const systemPrompt =
      'I work in the finance department. Always use formal language.';
    const savedPrompt = new UserSystemPrompt({ userId, systemPrompt });

    repository.upsert.mockResolvedValue(savedPrompt);

    const result = await useCase.execute(
      new UpsertUserSystemPromptCommand(systemPrompt),
    );

    expect(result.userId).toEqual(userId);
    expect(result.systemPrompt).toEqual(systemPrompt);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId, systemPrompt }),
    );
  });

  it('should pass a UserSystemPrompt domain object with userId from context to the repository', async () => {
    const systemPrompt = 'Please respond in German.';
    const savedPrompt = new UserSystemPrompt({ userId, systemPrompt });
    repository.upsert.mockResolvedValue(savedPrompt);

    await useCase.execute(new UpsertUserSystemPromptCommand(systemPrompt));

    const passedArg = repository.upsert.mock.calls[0][0];
    expect(passedArg).toBeInstanceOf(UserSystemPrompt);
    expect(passedArg.id).toBeDefined();
    expect(passedArg.userId).toBe(userId);
    expect(passedArg.systemPrompt).toBe(systemPrompt);
  });
});
