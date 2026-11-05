import { Injectable } from '@nestjs/common';
import { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import { MemoryDisabledError } from 'src/domain/memory/application/memory.errors';

/**
 * Memory is opt-in per organization. The check lives here rather than in a
 * guard because the organization comes from the request context, which Nest
 * only populates after guards have run.
 */
@Injectable()
export class MemoryAvailabilityService {
  constructor(
    private readonly getOrgChatSettingsUseCase: GetOrgChatSettingsUseCase,
  ) {}

  async isEnabled(): Promise<boolean> {
    const { memoryEnabled } = await this.getOrgChatSettingsUseCase.execute();
    return memoryEnabled;
  }

  async assertEnabled(): Promise<void> {
    if (!(await this.isEnabled())) {
      throw new MemoryDisabledError();
    }
  }
}
