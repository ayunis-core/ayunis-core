import type { Message as RuntimeMessage } from '@ayunis/agent-runtime';
import { randomUUID } from 'crypto';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import {
  TEST_USER_ID,
  aCapabilityContext,
  aThread,
  createAssembleToolUseCase,
  sectionsIn,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { callContext } from 'src/domain/runs/testing/runtime-hook-context.fixture';
import {
  MEMORY_NUDGE_INTERVAL,
  MemoryCapability,
  createMemoryNudgeHook,
  shouldNudgeMemory,
} from './memory.capability';

const threadId = randomUUID();

function capability(options: { load?: () => Promise<MemoryEntry[]> } = {}) {
  const { load = () => Promise.resolve([]) } = options;
  return new MemoryCapability(
    { execute: jest.fn(load) } as never,
    createAssembleToolUseCase(),
  );
}

const memoryContext = (
  overrides: Parameters<typeof aCapabilityContext>[0] = {},
) => aCapabilityContext({ personalContext: { memory: true }, ...overrides });

function entry(key: string, content: string, description?: string) {
  return new MemoryEntry({ userId: TEST_USER_ID, key, content, description });
}

const user = () =>
  new UserMessage({ threadId, content: [new TextMessageContent('Hallo')] });
const assistant = () =>
  new AssistantMessage({ threadId, content: [new TextMessageContent('Hi')] });
const toolResult = () =>
  new ToolResultMessage({
    threadId,
    content: [new ToolResultMessageContent(randomUUID(), 'create_file', 'ok')],
  });

/** `count` user messages, each answered except the last. */
function conversation(count: number) {
  return [
    ...Array.from({ length: count - 1 }, () => [user(), assistant()]).flat(),
    user(),
  ];
}

describe('MemoryCapability', () => {
  it('offers both tools and renders the reserved keys in full and the others by description', async () => {
    const contribution = await capability({
      load: () =>
        Promise.resolve([
          entry('personal', 'Sachbearbeiterin im Bauamt'),
          entry('preferences', 'Siezen, kurze Antworten'),
          entry(
            'report_template',
            'Einleitung, drei Befunde, nächste Schritte',
            'Wie Ratsberichte aufgebaut sein sollen',
          ),
        ]),
    }).contribute(memoryContext());

    expect(toolNames(contribution)).toEqual([
      ToolType.GET_MEMORY,
      ToolType.SET_MEMORY,
    ]);
    const [section] = sectionsIn(contribution, PromptSlot.CUSTOM_INSTRUCTIONS);
    expect(section).toContain(
      '<personal>\nSachbearbeiterin im Bauamt\n</personal>',
    );
    expect(section).toContain(
      '<preferences>\nSiezen, kurze Antworten\n</preferences>',
    );
    expect(section).toContain(
      '<entry key="report_template">Wie Ratsberichte aufgebaut sein sollen</entry>',
    );
    expect(section).not.toContain('drei Befunde');
    expect(contribution.hooks).toHaveLength(1);
  });

  it('contributes nothing when the run may not use memory', async () => {
    const load = jest.fn(() => Promise.resolve([entry('personal', 'Bauamt')]));

    const contribution = await capability({ load }).contribute(
      aCapabilityContext({ personalContext: { memory: false } }),
    );

    expect(contribution).toEqual({});
    expect(load).not.toHaveBeenCalled();
  });

  it('still runs, without stored memory, when memory cannot be read', async () => {
    const contribution = await capability({
      load: () => Promise.reject(new Error('connection reset')),
    }).contribute(memoryContext());

    expect(toolNames(contribution)).toEqual([
      ToolType.GET_MEMORY,
      ToolType.SET_MEMORY,
    ]);
    expect(
      sectionsIn(contribution, PromptSlot.CUSTOM_INSTRUCTIONS)[0],
    ).not.toContain('<personal>');
  });

  it('shows the reserved keys without tools, rules or reminder when the model cannot use tools', async () => {
    const contribution = await capability({
      load: () => Promise.resolve([entry('personal', 'Bauamt')]),
    }).contribute(memoryContext({ canUseTools: false }));

    expect(toolNames(contribution)).toEqual([]);
    expect(contribution.hooks ?? []).toEqual([]);
    const [section] = sectionsIn(contribution, PromptSlot.CUSTOM_INSTRUCTIONS);
    expect(section).toContain('<personal>\nBauamt\n</personal>');
    expect(section).not.toContain('set_memory');
  });
});

describe('shouldNudgeMemory', () => {
  it('nudges on every fifth user message and not in between', () => {
    const nudged = Array.from({ length: 3 * MEMORY_NUDGE_INTERVAL }, (_, i) =>
      shouldNudgeMemory(conversation(i + 1)),
    );

    expect(nudged.flatMap((nudge, i) => (nudge ? [i + 1] : []))).toEqual([
      5, 10, 15,
    ]);
  });

  // A client tool result continues the run without a new user message.
  it('does not nudge again when a tool result continues the fifth message', () => {
    const messages = [
      ...conversation(MEMORY_NUDGE_INTERVAL),
      assistant(),
      toolResult(),
    ];

    expect(shouldNudgeMemory(messages)).toBe(false);
  });
});

describe('createMemoryNudgeHook', () => {
  function sentMessages(
    hook: ReturnType<typeof createMemoryNudgeHook>,
    turn = 1,
  ): RuntimeMessage[] {
    const ctx = callContext({ turn });
    hook.beforeModelCall!(ctx);
    const transform = jest.mocked(ctx.transformMessages).mock.calls[0]?.[0];
    return transform ? transform([]) : [];
  }

  it('reminds on the first turn once the run’s fifth user message has joined the thread', () => {
    const thread: Thread = aThread({
      messages: conversation(MEMORY_NUDGE_INTERVAL - 1),
    });
    thread.messages.push(assistant());
    const hook = createMemoryNudgeHook(thread);
    thread.messages.push(user());

    const [reminder] = sentMessages(hook);

    expect(reminder.role).toBe('system');
    expect(JSON.stringify(reminder.content)).toContain('Memory check-in');
  });

  it('does not remind on later turns of the same run', () => {
    const hook = createMemoryNudgeHook(
      aThread({ messages: conversation(MEMORY_NUDGE_INTERVAL) }),
    );

    expect(sentMessages(hook, 2)).toEqual([]);
  });
});
