import { UpsertOrgChatSettingsUseCase } from './upsert-org-chat-settings.use-case';
import { UpsertOrgChatSettingsCommand } from './upsert-org-chat-settings.command';
import type { OrgChatSettingsRepository } from '../../ports/org-chat-settings.repository';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';
import { randomUUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('UpsertOrgChatSettingsUseCase', () => {
  let useCase: UpsertOrgChatSettingsUseCase;
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

    useCase = new UpsertOrgChatSettingsUseCase(
      repository,
      contextService as unknown as ContextService,
    );
  });

  it('should persist the new internet access setting and return the result', async () => {
    const saved = new OrgChatSettings({ orgId, internetSearchEnabled: false });
    repository.upsert.mockResolvedValue(saved);

    const result = await useCase.execute(
      new UpsertOrgChatSettingsCommand(false),
    );

    expect(result.orgId).toEqual(orgId);
    expect(result.internetSearchEnabled).toBe(false);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ orgId, internetSearchEnabled: false }),
    );
  });

  it('should pass an OrgChatSettings domain object with orgId from context', async () => {
    const saved = new OrgChatSettings({ orgId, internetSearchEnabled: true });
    repository.upsert.mockResolvedValue(saved);

    await useCase.execute(new UpsertOrgChatSettingsCommand(true));

    const passedArg = repository.upsert.mock.calls[0][0];
    expect(passedArg).toBeInstanceOf(OrgChatSettings);
    expect(passedArg.id).toBeDefined();
    expect(passedArg.orgId).toBe(orgId);
    expect(passedArg.internetSearchEnabled).toBe(true);
  });

  it('should throw UnauthorizedAccessError when orgId is missing from context', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new UpsertOrgChatSettingsCommand(false)),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });
});
