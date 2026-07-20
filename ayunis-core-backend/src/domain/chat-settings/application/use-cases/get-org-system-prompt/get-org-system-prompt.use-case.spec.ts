import { GetOrgSystemPromptUseCase } from './get-org-system-prompt.use-case';
import type { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('GetOrgSystemPromptUseCase', () => {
  let useCase: GetOrgSystemPromptUseCase;
  let repository: jest.Mocked<OrgSystemPromptsRepository>;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;

  const orgId = randomUUID();

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn(),
      upsert: jest.fn(),
      deleteByOrgId: jest.fn(),
    };

    contextService = {
      get: jest.fn().mockReturnValue(orgId),
    };

    useCase = new GetOrgSystemPromptUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should return the org system prompt when it exists', async () => {
    const existingPrompt = new OrgSystemPrompt({
      orgId,
      systemPrompt: 'Refer to citizens as "Bürgerinnen und Bürger".',
    });
    repository.findByOrgId.mockResolvedValue(existingPrompt);

    const result = await useCase.execute();

    expect(result).toEqual(existingPrompt);
    expect(repository.findByOrgId).toHaveBeenCalledWith(orgId);
  });

  it('should return null when no system prompt exists for the org', async () => {
    repository.findByOrgId.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toBeNull();
    expect(repository.findByOrgId).toHaveBeenCalledWith(orgId);
  });

  it('should get the orgId from the context service', async () => {
    repository.findByOrgId.mockResolvedValue(null);

    await useCase.execute();

    expect(contextService.get).toHaveBeenCalledWith('orgId');
  });

  it('should throw UnauthorizedAccessError when orgId is missing from context', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.findByOrgId).not.toHaveBeenCalled();
  });
});
