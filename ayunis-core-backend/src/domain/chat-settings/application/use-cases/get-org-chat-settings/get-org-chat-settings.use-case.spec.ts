import { GetOrgChatSettingsUseCase } from './get-org-chat-settings.use-case';
import type { OrgChatSettingsRepository } from '../../ports/org-chat-settings.repository';
import { OrgChatSettings } from '../../../domain/org-chat-settings.entity';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('GetOrgChatSettingsUseCase', () => {
  let useCase: GetOrgChatSettingsUseCase;
  let repository: jest.Mocked<OrgChatSettingsRepository>;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;

  const orgId = randomUUID();

  beforeEach(() => {
    repository = {
      findByOrgId: jest.fn(),
      upsert: jest.fn(),
    };

    contextService = {
      get: jest.fn().mockReturnValue(orgId),
    };

    useCase = new GetOrgChatSettingsUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should return the stored org chat settings when they exist', async () => {
    const stored = new OrgChatSettings({ orgId, internetSearchEnabled: false });
    repository.findByOrgId.mockResolvedValue(stored);

    const result = await useCase.execute();

    expect(result).toEqual(stored);
    expect(result.internetSearchEnabled).toBe(false);
    expect(repository.findByOrgId).toHaveBeenCalledWith(orgId);
  });

  it('should default to internet access enabled when no settings exist', async () => {
    repository.findByOrgId.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(result).toBeInstanceOf(OrgChatSettings);
    expect(result.orgId).toBe(orgId);
    expect(result.internetSearchEnabled).toBe(true);
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
