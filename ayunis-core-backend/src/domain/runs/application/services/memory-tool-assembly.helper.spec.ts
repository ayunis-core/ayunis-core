import type { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import { resolveMemoryAvailability } from './memory-tool-assembly.helper';

function orgChatSettingsUseCase(memoryEnabled: boolean) {
  return {
    execute: jest.fn().mockResolvedValue({ memoryEnabled }),
  } as unknown as jest.Mocked<GetOrgChatSettingsUseCase>;
}

describe('resolveMemoryAvailability', () => {
  it('is available when the organization has enabled memory', async () => {
    await expect(
      resolveMemoryAvailability({
        isAnonymous: false,
        getOrgChatSettingsUseCase: orgChatSettingsUseCase(true),
      }),
    ).resolves.toBe(true);
  });

  it('is unavailable when the organization has memory disabled', async () => {
    await expect(
      resolveMemoryAvailability({
        isAnonymous: false,
        getOrgChatSettingsUseCase: orgChatSettingsUseCase(false),
      }),
    ).resolves.toBe(false);
  });

  it('stays unavailable in an anonymous run without consulting the organization', async () => {
    const useCase = orgChatSettingsUseCase(true);

    await expect(
      resolveMemoryAvailability({
        isAnonymous: true,
        getOrgChatSettingsUseCase: useCase,
      }),
    ).resolves.toBe(false);
    expect(useCase.execute).not.toHaveBeenCalled();
  });
});
