import { RunAbortedError, RunContext, run } from '@ayunis/agent-runtime';
import type { Hook, ModelProvider, ProviderChunk } from '@ayunis/agent-runtime';
import { randomUUID } from 'crypto';
import type { SaveAssistantMessageCommand } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.command';
import type { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import type { CreateToolResultMessageCommand } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import type { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import type { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import {
  assistantMessageId,
  toolResultMessageId,
} from 'src/domain/runs/application/agent-runtime/message-id';
import { PersistenceHookFactory } from './persistence-hook.factory';

describe('PersistenceHookFactory', () => {
  it('persists only the accepted response after an empty-response retry', async () => {
    const save = saveSuccessfulMessages();
    const context = RunContext.create();
    const { hook } = buildHook(save);
    let calls = 0;
    const model: ModelProvider = {
      name: 'empty-then-accepted',
      stream() {
        calls += 1;
        return chunks(
          calls === 1
            ? []
            : [{ textDelta: 'Accepted answer' }, { finishReason: 'stop' }],
        );
      },
    };

    await drain(
      run({
        instructions: '',
        model,
        messages: [userMessage()],
        hooks: [hook],
        context,
        retry: { maxRetries: 1 },
      }),
    );

    expect(save).toHaveBeenCalledTimes(1);
    const command = save.mock.calls[0][0] as SaveAssistantMessageCommand;
    expect(command.message.id).toBe(assistantMessageId(context.runId, 0));
    expect(command.message.content).toMatchObject([
      { type: MessageContentType.TEXT, text: 'Accepted answer' },
    ]);
    expect(hook.afterModelCall).toBeUndefined();
    expect(hook.modelCallInterrupted).toBeUndefined();
  });

  it.each([
    [
      'accepted',
      [
        MessageContentType.THINKING,
        MessageContentType.TEXT,
        MessageContentType.TOOL_USE,
      ],
    ],
    ['aborted', [MessageContentType.THINKING, MessageContentType.TEXT]],
    [
      'consumer_abandoned',
      [MessageContentType.THINKING, MessageContentType.TEXT],
    ],
  ] as const)(
    'persists the safe assistant content for an %s turn carrying an accepted call',
    async (turnOutcome, expectedTypes) => {
      const save = saveSuccessfulMessages();
      const context = RunContext.create();
      const { hook } = buildHook(save);

      await hook.afterModelTurn?.(
        acceptedCallTurnContext(context, turnOutcome),
      );

      expect(savedContentTypes(save)).toEqual(expectedTypes);
    },
  );

  it('persists terminal partial text and thinking without unexecuted tool calls', async () => {
    const save = saveSuccessfulMessages();
    const context = RunContext.create();
    const { hook, addMessage } = buildHook(save);
    const model = interruptingProvider({
      thinkingDelta: 'Working',
      textDelta: 'Partial answer',
      toolCallDeltas: [
        {
          index: 0,
          id: 'call-1',
          name: 'search',
          argumentsDelta: '{"query":"budget"}',
        },
      ],
    });

    await drain(
      run({
        instructions: '',
        model,
        messages: [userMessage()],
        hooks: [hook],
        context,
      }),
    );

    expect(save).toHaveBeenCalledTimes(1);
    const command = save.mock.calls[0][0] as SaveAssistantMessageCommand;
    expect(command.message.id).toBe(assistantMessageId(context.runId, 0));
    expect(command.message.content).toMatchObject([
      { type: MessageContentType.THINKING, thinking: 'Working' },
      { type: MessageContentType.TEXT, text: 'Partial answer' },
    ]);
    expect(command.message.content).toHaveLength(2);
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: command.message }),
    );
  });

  it('persists visible text when the model call is aborted', async () => {
    const save = saveSuccessfulMessages();
    const controller = new AbortController();
    const { hook } = buildHook(save);
    const model: ModelProvider = {
      name: 'aborted-provider',
      async *stream() {
        yield {
          textDelta: 'Answer before abort',
          toolCallDeltas: [
            {
              index: 0,
              id: 'cancelled-call',
              name: 'search',
              argumentsDelta: '{"query":"budget"}',
            },
          ],
        };
        controller.abort();
        throw new DOMException('The operation was aborted', 'AbortError');
      },
    };

    await drain(
      run({
        instructions: '',
        model,
        messages: [userMessage()],
        hooks: [hook],
        signal: controller.signal,
      }),
    );

    expect(savedText(save)).toBe('Answer before abort');
    expect(savedContentTypes(save)).toEqual([MessageContentType.TEXT]);
  });

  it('persists visible text when the consumer abandons the run', async () => {
    const save = saveSuccessfulMessages();
    const { hook } = buildHook(save);
    const model: ModelProvider = {
      name: 'abandoned-provider',
      async *stream() {
        yield {
          textDelta: 'Answer before disconnect',
          toolCallDeltas: [
            {
              index: 0,
              id: 'abandoned-call',
              name: 'search',
              argumentsDelta: '{"query":"budget"}',
            },
          ],
        };
        await new Promise(() => undefined);
      },
    };

    for await (const event of run({
      instructions: '',
      model,
      messages: [userMessage()],
      hooks: [hook],
    })) {
      if (event.type === 'text_delta') break;
    }

    expect(savedText(save)).toBe('Answer before disconnect');
    expect(savedContentTypes(save)).toEqual([MessageContentType.TEXT]);
  });

  it('does not persist terminal rejected recovery output', async () => {
    const save = saveSuccessfulMessages();
    const { hook } = buildHook(save);
    const model = completingProvider([
      { textDelta: 'Rejected answer' },
      {
        toolCallDeltas: [
          {
            index: 0,
            id: 'broken-call',
            name: 'search',
            argumentsDelta: '{"query":',
          },
        ],
      },
      { finishReason: 'tool_calls' },
    ]);

    await drain(
      run({
        instructions: '',
        model,
        messages: [userMessage()],
        hooks: [hook],
      }),
    );

    expect(save).not.toHaveBeenCalled();
  });

  it('does not persist a tool call rejected by the tool-disabled fallback', async () => {
    const save = saveSuccessfulMessages();
    const { hook } = buildHook(save);
    let calls = 0;
    const model: ModelProvider = {
      name: 'invalid-fallback',
      stream() {
        calls += 1;
        return chunks(
          calls === 1
            ? [
                {
                  toolCallDeltas: [
                    {
                      index: 0,
                      id: 'broken-call',
                      name: 'search',
                      argumentsDelta: '{"query":',
                    },
                  ],
                },
                { finishReason: 'tool_calls' },
              ]
            : [
                {
                  toolCallDeltas: [
                    {
                      index: 0,
                      id: 'unexecuted-call',
                      name: 'search',
                      argumentsDelta: '{"query":"budget"}',
                    },
                  ],
                },
                { finishReason: 'tool_calls' },
              ],
        );
      },
    };

    await drain(
      run({
        instructions: '',
        model,
        messages: [userMessage()],
        hooks: [hook],
        retry: { maxRetries: 1 },
      }),
    );

    expect(calls).toBe(2);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not persist an empty terminal model call', async () => {
    const save = saveSuccessfulMessages();
    const { hook } = buildHook(save);

    await drain(
      run({
        instructions: '',
        model: interruptingProvider({}),
        messages: [userMessage()],
        hooks: [hook],
      }),
    );

    expect(save).not.toHaveBeenCalled();
  });

  it('aborts the run when its thread disappeared before persistence', async () => {
    const save = jest.fn().mockResolvedValue(null);
    const { hook, addMessage } = buildHook(save);
    const events: unknown[] = [];

    for await (const event of run({
      instructions: '',
      model: completingProvider([
        { textDelta: 'Completed answer' },
        { finishReason: 'stop' },
      ]),
      messages: [userMessage()],
      hooks: [hook],
    })) {
      events.push(event);
    }

    expect(save).toHaveBeenCalledTimes(1);
    expect(addMessage).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({
      type: 'run_end',
      status: 'aborted',
    });
  });

  it('drops tool calls when a critical after-call failure terminates an accepted call', async () => {
    const save = saveSuccessfulMessages();
    const { hook } = buildHook(save);
    const criticalAfterCall: Hook = {
      name: 'critical-after-call',
      afterModelCall: () => {
        throw new Error('usage persistence failed');
      },
    };

    await drain(
      run({
        instructions: '',
        model: completingProvider([
          {
            textDelta: 'Answer before terminal hook failure',
            toolCallDeltas: [
              {
                index: 0,
                id: 'unexecuted-call',
                name: 'search',
                argumentsDelta: '{"query":"budget"}',
              },
            ],
          },
          { finishReason: 'tool_calls' },
        ]),
        messages: [userMessage()],
        hooks: [criticalAfterCall, hook],
      }),
    );

    expect(savedText(save)).toBe('Answer before terminal hook failure');
    expect(savedContentTypes(save)).toEqual([MessageContentType.TEXT]);
  });

  it('keeps terminal persistence critical while later cleanup hooks run', async () => {
    const save = jest.fn().mockRejectedValue(new Error('database unavailable'));
    const { hook } = buildHook(save);
    const cleanupAfterTurn = jest.fn();
    const cleanupRunEnd = jest.fn();
    const events: Array<Record<string, unknown>> = [];

    for await (const event of run({
      instructions: '',
      model: completingProvider([
        { textDelta: 'Completed answer' },
        { finishReason: 'stop' },
      ]),
      messages: [userMessage()],
      hooks: [
        hook,
        {
          name: 'cleanup',
          afterModelTurn: cleanupAfterTurn,
          runEnd: cleanupRunEnd,
        },
      ],
    })) {
      events.push(event as unknown as Record<string, unknown>);
    }

    expect(cleanupAfterTurn).toHaveBeenCalledTimes(1);
    expect(cleanupRunEnd).toHaveBeenCalledTimes(1);
    expect(events.find((event) => event.type === 'error')).toMatchObject({
      code: 'HOOK_FAILED',
      details: { hookName: 'ayunis-persistence', phase: 'afterModelTurn' },
    });
    expect(hook.terminalFailureMode).toBe('critical');
  });

  it('flushes all tool results from an iteration as one deterministic message', async () => {
    const createToolResult = jest
      .fn()
      .mockImplementation((command) => Promise.resolve(command));
    const { hook, addMessage } = buildHook(jest.fn(), createToolResult);
    const context = RunContext.create();

    await hook.afterToolCall?.(
      toolResultContext(context, 'call-1', 'first result', false),
    );
    await hook.afterToolCall?.(
      toolResultContext(context, 'call-2', 'second result', true),
    );

    expect(createToolResult).toHaveBeenCalledTimes(1);
    const command = createToolResult.mock
      .calls[0][0] as CreateToolResultMessageCommand;
    expect(command.id).toBe(toolResultMessageId(context.runId, 0));
    expect(command.content).toMatchObject([
      { toolId: 'call-1', result: 'first result' },
      { toolId: 'call-2', result: 'second result' },
    ]);
    expect(addMessage).toHaveBeenCalledTimes(1);
  });

  it('defensively flushes pending tool results before the next model turn', async () => {
    const createToolResult = jest
      .fn()
      .mockImplementation((command) => Promise.resolve(command));
    const { hook } = buildHook(jest.fn(), createToolResult);
    const context = RunContext.create();

    await hook.afterToolCall?.(
      toolResultContext(context, 'call-1', 'search result', false),
    );
    await hook.beforeModelTurn?.({ context } as never);

    expect(createToolResult).toHaveBeenCalledTimes(1);
    expect(hook.beforeModelCall).toBeUndefined();
  });

  it('aborts when the thread disappears before tool results are persisted', async () => {
    const createToolResult = jest.fn().mockResolvedValue(null);
    const { hook, addMessage } = buildHook(jest.fn(), createToolResult);
    const context = RunContext.create();

    await expect(
      hook.afterToolCall?.(
        toolResultContext(context, 'call-1', 'search result', true),
      ),
    ).rejects.toBeInstanceOf(RunAbortedError);
    expect(createToolResult).toHaveBeenCalledTimes(1);
    expect(addMessage).not.toHaveBeenCalled();
  });

  it('does not retry a failed tool-result write when the run ends', async () => {
    const failure = new Error(
      'Failed to create tool message: invalid input syntax for type json',
    );
    const createToolResult = jest.fn().mockRejectedValue(failure);
    const { hook } = buildHook(jest.fn(), createToolResult);
    const context = RunContext.create();

    await expect(
      hook.afterToolCall?.(
        toolResultContext(context, 'call-1', 'scraped page', true),
      ),
    ).rejects.toBe(failure);

    await expect(
      hook.runEnd?.({ context, messages: [], status: 'error' } as never),
    ).resolves.toBeUndefined();
    expect(createToolResult).toHaveBeenCalledTimes(1);
  });
});

function buildHook(
  save: jest.Mock,
  createToolResult: jest.Mock = jest.fn().mockResolvedValue(undefined),
): { hook: Hook; addMessage: jest.Mock } {
  const addMessage = jest.fn();
  const factory = new PersistenceHookFactory(
    { execute: save } as unknown as SaveAssistantMessageUseCase,
    {
      execute: createToolResult,
    } as unknown as CreateToolResultMessageUseCase,
    { execute: addMessage } as unknown as AddMessageToThreadUseCase,
  );
  const thread = { id: randomUUID(), messages: [] } as unknown as Thread;
  const hook = factory.create({
    thread,
    integrations: new RuntimeToolIntegrationRegistry([]),
  });
  return { hook, addMessage };
}

function saveSuccessfulMessages(): jest.Mock {
  return jest
    .fn()
    .mockImplementation((command) => Promise.resolve(command.message));
}

function savedText(save: jest.Mock): string {
  const command = save.mock.calls[0][0] as SaveAssistantMessageCommand;
  return command.message.content
    .flatMap((content) => ('text' in content ? [content.text] : []))
    .join('');
}

function savedContentTypes(save: jest.Mock): MessageContentType[] {
  const command = save.mock.calls[0][0] as SaveAssistantMessageCommand;
  return command.message.content.map((content) => content.type);
}

function userMessage() {
  return {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: 'Hi' }],
  };
}

function acceptedCallTurnContext(
  context: RunContext,
  type: 'accepted' | 'aborted' | 'consumer_abandoned',
) {
  return {
    context,
    iteration: 0,
    outcome: {
      type,
      call: {
        type: 'accepted',
        providerConsumptionStarted: true,
        producedOutput: true,
        visibleOutput: true,
        message: {
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking: 'Considering tools',
              id: null,
              signature: null,
            },
            { type: 'text', text: 'I will search for that.' },
            {
              type: 'tool_use',
              id: 'accepted-call',
              name: 'search',
              input: { query: 'budget' },
            },
          ],
        },
      },
    },
  } as never;
}

function toolResultContext(
  context: RunContext,
  id: string,
  result: string,
  isLastToolCall: boolean,
) {
  return {
    context,
    iteration: 0,
    toolCall: { id, name: 'search', input: {} },
    result,
    isError: false,
    outcome: 'success' as const,
    isLastToolCall,
  } as never;
}

function completingProvider(chunksToYield: ProviderChunk[]): ModelProvider {
  return {
    name: 'completing',
    stream() {
      return chunks(chunksToYield);
    },
  };
}

function interruptingProvider(chunk: ProviderChunk): ModelProvider {
  return {
    name: 'interrupting',
    async *stream() {
      yield chunk;
      throw new Error('provider disconnected');
    },
  };
}

function chunks(
  values: readonly ProviderChunk[],
): AsyncIterable<ProviderChunk> {
  return {
    async *[Symbol.asyncIterator]() {
      yield* values;
    },
  };
}

async function drain(events: AsyncIterable<unknown>): Promise<void> {
  const iterator = events[Symbol.asyncIterator]();
  while (!(await iterator.next()).done) {
    // Exhausting the iterator triggers terminal hooks and finalization.
  }
}
