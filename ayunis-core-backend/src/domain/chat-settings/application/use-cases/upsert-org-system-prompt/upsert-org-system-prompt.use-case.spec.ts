import { UpsertOrgSystemPromptUseCase } from './upsert-org-system-prompt.use-case';
import { UpsertOrgSystemPromptCommand } from './upsert-org-system-prompt.command';
import type { OrgSystemPromptsRepository } from '../../ports/org-system-prompts.repository';
import { OrgSystemPrompt } from '../../../domain/org-system-prompt.entity';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';

describe('UpsertOrgSystemPromptUseCase', () => {
  let useCase: UpsertOrgSystemPromptUseCase;
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

    useCase = new UpsertOrgSystemPromptUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should create a new org system prompt and return the result', async () => {
    const systemPrompt =
      'All responses must comply with municipal communication guidelines.';
    const savedPrompt = new OrgSystemPrompt({ orgId, systemPrompt });

    repository.upsert.mockResolvedValue(savedPrompt);

    const result = await useCase.execute(
      new UpsertOrgSystemPromptCommand(systemPrompt),
    );

    expect(result.orgId).toEqual(orgId);
    expect(result.systemPrompt).toEqual(systemPrompt);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, systemPrompt }),
    );
  });

  it('should pass an OrgSystemPrompt domain object with orgId from context to the repository', async () => {
    const systemPrompt = 'Always answer in plain administrative German.';
    const savedPrompt = new OrgSystemPrompt({ orgId, systemPrompt });
    repository.upsert.mockResolvedValue(savedPrompt);

    await useCase.execute(new UpsertOrgSystemPromptCommand(systemPrompt));

    const passedArg = repository.upsert.mock.calls[0][0];
    expect(passedArg).toBeInstanceOf(OrgSystemPrompt);
    expect(passedArg.id).toBeDefined();
    expect(passedArg.orgId).toBe(orgId);
    expect(passedArg.systemPrompt).toBe(systemPrompt);
  });
});
