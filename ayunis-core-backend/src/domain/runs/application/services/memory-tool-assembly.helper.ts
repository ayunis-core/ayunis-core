import type { Logger } from '@nestjs/common';
import type { GetOrgChatSettingsUseCase } from 'src/domain/chat-settings/application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import type { FindUserMemoryUseCase } from 'src/domain/memory/application/use-cases/find-user-memory/find-user-memory.use-case';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';

/**
 * Memory is an organization-level opt-in (`OrgChatSettings.memoryEnabled`).
 * Anonymous threads stay excluded even when it is on: PII there is replaced by
 * per-thread `{{pii:…}}` placeholders, so anything written to memory would be
 * meaningless — and silently wrong — in every other thread.
 */
export async function resolveMemoryAvailability(args: {
  isAnonymous: boolean;
  getOrgChatSettingsUseCase: GetOrgChatSettingsUseCase;
}): Promise<boolean> {
  if (args.isAnonymous) {
    return false;
  }

  const settings = await args.getOrgChatSettingsUseCase.execute();

  return settings.memoryEnabled;
}

export async function assembleMemoryTools(args: {
  assembleToolsUseCase: AssembleToolUseCase;
}): Promise<Tool[]> {
  return Promise.all(
    [ToolType.GET_MEMORY, ToolType.SET_MEMORY].map((type) =>
      args.assembleToolsUseCase.execute(new AssembleToolCommand({ type })),
    ),
  );
}

/**
 * Memory enriches a run but is never a precondition for it: a read failure
 * degrades to a run without memory rather than a failed chat.
 */
export async function loadMemoryForRun(args: {
  findUserMemoryUseCase: FindUserMemoryUseCase;
  logger: Logger;
}): Promise<MemoryEntry[]> {
  try {
    return await args.findUserMemoryUseCase.execute();
  } catch (error) {
    args.logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to load user memory, continuing without it',
    );
    return [];
  }
}
