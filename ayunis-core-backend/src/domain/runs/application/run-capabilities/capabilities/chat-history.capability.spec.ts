import type { UUID } from 'crypto';
import type { ChatListTool } from 'src/domain/tools/domain/tools/chat-list-tool.entity';
import type { ChatGrepTool } from 'src/domain/tools/domain/tools/chat-grep-tool.entity';
import type { ChatReadTool } from 'src/domain/tools/domain/tools/chat-read-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { ChatHistoryCapability } from './chat-history.capability';

const workspaceId = '55555555-5555-4555-8555-555555555555' as UUID;

function contribute(overrides: Parameters<typeof aCapabilityContext>[0] = {}) {
  return new ChatHistoryCapability(createAssembleToolUseCase()).contribute(
    aCapabilityContext({
      personalContext: { memory: false, chatHistory: true },
      ...overrides,
    }),
  );
}

describe('ChatHistoryCapability', () => {
  it('offers all three tools scoped to the run’s own chat and workspace, with usage guidance', async () => {
    const thread = aThread({ workspaceId });

    const contribution = await contribute({ thread });

    expect(toolNames(contribution)).toEqual([
      ToolType.CHAT_LIST,
      ToolType.CHAT_GREP,
      ToolType.CHAT_READ,
    ]);
    for (const tool of contribution.tools as (
      ChatListTool | ChatGrepTool | ChatReadTool
    )[]) {
      expect(tool.scope).toEqual({
        currentThreadId: thread.id,
        workspaceId,
      });
    }
    expect(sectionsIn(contribution, PromptSlot.TOOL_USAGE)).toEqual([
      expect.stringContaining('<past_chats>'),
    ]);
  });

  it('scopes a chat outside any workspace to all of the user’s chats', async () => {
    const thread = aThread();

    const contribution = await contribute({ thread });

    expect((contribution.tools?.[0] as ChatListTool).scope).toEqual({
      currentThreadId: thread.id,
      workspaceId: null,
    });
  });

  // Covers the flag being off, anonymous runs and non-chat profiles, which
  // PersonalContextAccessService all resolves to no chat history.
  it('contributes nothing to a run without chat history', async () => {
    await expect(
      contribute({ personalContext: { memory: true, chatHistory: false } }),
    ).resolves.toEqual({});
  });

  it('contributes nothing when the model cannot use tools', async () => {
    await expect(contribute({ canUseTools: false })).resolves.toEqual({});
  });
});
