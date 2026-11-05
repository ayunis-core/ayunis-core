import type { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import { MemoryDisabledError } from 'src/domain/memory/application/memory.errors';
import { MemoryAvailabilityService } from './memory-availability.service';

describe('MemoryAvailabilityService', () => {
  function build(memoryEnabled: boolean) {
    const getOrgChatSettingsUseCase = {
      execute: jest.fn().mockResolvedValue({ memoryEnabled }),
    } as unknown as GetOrgChatSettingsUseCase;

    return new MemoryAvailabilityService(getOrgChatSettingsUseCase);
  }

  it('passes when the organization turned memory on', async () => {
    await expect(build(true).assertEnabled()).resolves.toBeUndefined();
    await expect(build(true).isEnabled()).resolves.toBe(true);
  });

  // A 404 rather than a 403 keeps a declined feature invisible.
  it('reports memory as missing when the organization has it off', async () => {
    await expect(build(false).assertEnabled()).rejects.toThrow(
      MemoryDisabledError,
    );
    await expect(build(false).isEnabled()).resolves.toBe(false);
  });

  it('answers with a 404 status so the feature stays hidden', async () => {
    await build(false)
      .assertEnabled()
      .catch((error: MemoryDisabledError) => {
        expect(error.statusCode).toBe(404);
      });
  });
});
