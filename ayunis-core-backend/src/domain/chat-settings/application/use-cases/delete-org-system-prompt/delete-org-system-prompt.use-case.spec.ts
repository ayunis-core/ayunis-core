import { DeleteOrgSystemPromptUseCase } from './delete-org-system-prompt.use-case';
import type { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';

describe('DeleteOrgSystemPromptUseCase', () => {
  let useCase: DeleteOrgSystemPromptUseCase;
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

    useCase = new DeleteOrgSystemPromptUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should call deleteByOrgId with orgId from context', async () => {
    repository.deleteByOrgId.mockResolvedValue();

    await useCase.execute();

    expect(repository.deleteByOrgId).toHaveBeenCalledWith(orgId);
    expect(contextService.get).toHaveBeenCalledWith('orgId');
  });

  it('should not throw when no system prompt exists for the org', async () => {
    repository.deleteByOrgId.mockResolvedValue();

    await expect(useCase.execute()).resolves.not.toThrow();
  });
});
