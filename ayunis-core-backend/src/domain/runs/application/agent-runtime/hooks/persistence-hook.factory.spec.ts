import { RunContext, run } from '@ayunis/agent-runtime';
import type { Hook, ModelProvider, ProviderChunk } from '@ayunis/agent-runtime';
import { randomUUID } from 'crypto';
import type { SaveAssistantMessageCommand } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.command';
import type { SaveAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import type { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import type { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { RuntimeToolIntegrationRegistry } from '../runtime-tool-integration.registry';
import { assistantMessageId } from '../message-id';
import { PersistenceHookFactory } from './persistence-hook.factory';

describe('PersistenceHookFactory', () => {
  it('persists partial text and thinking with the deterministic turn id', async () => {
    const save = jest
      .fn()
      .mockImplementation((command) => Promise.resolve(command.message));
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
          argumentsDelta: '{"query":',
        },
      ],
    });

    await drain(
      run({
        instructions: '',
        model,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
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

  it('aborts the run when its thread disappeared before persistence', async () => {
    const save = jest.fn().mockResolvedValue(null);
    const { hook, addMessage } = buildHook(save);
    const model = completingProvider([
      { textDelta: 'Partial answer' },
      { finishReason: 'stop' },
    ]);
    const events: unknown[] = [];

    for await (const event of run({
      instructions: '',
      model,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
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

  it('does not persist an empty assistant message after interruption', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const { hook, addMessage } = buildHook(save);
    const model = interruptingProvider({
      toolCallDeltas: [
        {
          index: 0,
          id: 'call-1',
          name: 'search',
          argumentsDelta: '{"query":',
        },
      ],
    });

    await drain(
      run({
        instructions: '',
        model,
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }],
        hooks: [hook],
      }),
    );

    expect(save).not.toHaveBeenCalled();
    expect(addMessage).not.toHaveBeenCalled();
  });
});

function buildHook(save: jest.Mock): { hook: Hook; addMessage: jest.Mock } {
  const addMessage = jest.fn();
  const factory = new PersistenceHookFactory(
    { execute: save } as unknown as SaveAssistantMessageUseCase,
    {
      execute: jest.fn().mockResolvedValue(undefined),
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

function completingProvider(chunks: ProviderChunk[]): ModelProvider {
  return {
    name: 'completing',
    async *stream() {
      yield* chunks;
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

async function drain(events: AsyncIterable<unknown>): Promise<void> {
  const iterator = events[Symbol.asyncIterator]();
  while (!(await iterator.next()).done) {
    // Exhausting the iterator triggers interruption hooks and finalization.
  }
}
