import { MockProvider, textTurn } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import type { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import type { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import type { ResolveModelProviderUseCase } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import type { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
import type { ToolAssemblyService } from '../../services/tool-assembly.service';
import type { MessageCleanupService } from '../../services/message-cleanup.service';
import { PersistenceHookFactory } from '../../agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from '../../agent-runtime/hooks/usage-hook.factory';
import type { RunStreamItem } from '../../../domain/run-pii-masks-update.entity';
import {
  RunUserInput,
  RunToolResultInput,
} from '../../../domain/run-input.entity';
import { ExecuteRunCommand } from '../execute-run/execute-run.command';
import { ExecuteRunViaRuntimeUseCase } from './execute-run-via-runtime.use-case';

const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
const userId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
const orgId = '323e4567-e89b-12d3-a456-426614174000' as UUID;

interface Harness {
  useCase: ExecuteRunViaRuntimeUseCase;
  save: jest.Mock;
  collectUsage: jest.Mock;
  cleanup: jest.Mock;
}

function buildHarness(overrides: { anonymous?: boolean } = {}): Harness {
  const model = {
    name: 'claude',
    provider: 'anthropic',
    canVision: false,
  } as unknown as LanguageModel;
  const permitted = {
    model,
    anonymousOnly: false,
  } as unknown as PermittedLanguageModel;
  const thread = {
    id: threadId,
    model: permitted,
    messages: [],
    isAnonymous: overrides.anonymous ?? false,
  } as unknown as Thread;

  const contextService = {
    get: jest.fn((key?: string | symbol) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      return undefined;
    }),
  } as unknown as ContextService;

  const findThreadUseCase = {
    execute: jest.fn().mockResolvedValue({ thread }),
  } as unknown as FindThreadUseCase;
  const inferenceUsageGuard = {
    preflight: jest.fn().mockResolvedValue(undefined),
    collectUsage: jest.fn(),
  } as unknown as jest.Mocked<InferenceUsageGuard>;
  const toolAssemblyService = {
    buildRunContext: jest
      .fn()
      .mockResolvedValue({ tools: [], instructions: 'system prompt' }),
  } as unknown as ToolAssemblyService;
  const userMessage = { id: 'user-msg', threadId } as unknown as UserMessage;
  const createUserMessageUseCase = {
    execute: jest.fn().mockResolvedValue(userMessage),
  } as unknown as CreateUserMessageUseCase;
  const addMessageToThreadUseCase = {
    execute: jest.fn(),
  } as unknown as AddMessageToThreadUseCase;
  const mapMessagesToInferenceUseCase = {
    execute: jest
      .fn()
      .mockResolvedValue([
        { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      ]),
  } as unknown as MapMessagesToInferenceUseCase;
  const resolveModelProviderUseCase = {
    execute: jest.fn().mockResolvedValue(new MockProvider([textTurn('Hello')])),
  } as unknown as ResolveModelProviderUseCase;
  const cleanup = jest.fn().mockResolvedValue(undefined);
  const messageCleanupService = {
    cleanupTrailingNonAssistantMessages: cleanup,
  } as unknown as MessageCleanupService;
  const eventEmitter = {
    emitAsync: jest.fn().mockResolvedValue([]),
  } as unknown as EventEmitter2;

  const save = jest.fn().mockResolvedValue(undefined);
  const persistenceHookFactory = new PersistenceHookFactory({
    execute: save,
  } as never);
  const collectUsage = inferenceUsageGuard.collectUsage as jest.Mock;
  const usageHookFactory = new UsageHookFactory(inferenceUsageGuard);

  const useCase = new ExecuteRunViaRuntimeUseCase(
    contextService,
    findThreadUseCase,
    inferenceUsageGuard,
    toolAssemblyService,
    createUserMessageUseCase,
    addMessageToThreadUseCase,
    mapMessagesToInferenceUseCase,
    resolveModelProviderUseCase,
    messageCleanupService,
    persistenceHookFactory,
    usageHookFactory,
    eventEmitter,
  );

  return { useCase, save, collectUsage, cleanup };
}

async function drain(
  gen: AsyncGenerator<RunStreamItem, void, void>,
): Promise<RunStreamItem[]> {
  const items: RunStreamItem[] = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items;
}

function userCommand(input = new RunUserInput('Hi there')): ExecuteRunCommand {
  return new ExecuteRunCommand({ threadId, input });
}

describe('ExecuteRunViaRuntimeUseCase', () => {
  it('streams a plain-chat turn, persisting and metering the assistant message', async () => {
    const { useCase, save, collectUsage } = buildHarness();

    const items = await drain(await useCase.execute(userCommand()));

    // first item is the user message, then the streamed assistant message(s)
    expect(items[0]).toMatchObject({ id: 'user-msg' });
    const assistant = items
      .slice(1)
      .filter((i): i is AssistantMessage => i instanceof AssistantMessage)
      .pop();
    expect(assistant).toBeDefined();
    expect((assistant!.content[0] as TextMessageContent).text).toBe('Hello');

    // persistence + usage hooks fired inside the loop
    expect(save).toHaveBeenCalledTimes(1);
    const savedMessage = save.mock.calls[0][0].message as AssistantMessage;
    expect((savedMessage.content[0] as TextMessageContent).text).toBe('Hello');
    // streamed and persisted assistant copies share the deterministic id
    expect(savedMessage.id).toBe(assistant!.id);
    expect(collectUsage).toHaveBeenCalledTimes(1);
  });

  it('rejects tool-result inputs (not yet supported on the runtime path)', async () => {
    const { useCase } = buildHarness();
    const command = new ExecuteRunCommand({
      threadId,
      input: new RunToolResultInput('t1', 'search', 'result'),
    });
    await expect(useCase.execute(command)).rejects.toThrow(
      /does not yet support tool-result/i,
    );
  });

  it('rejects anonymous threads (not yet supported on the runtime path)', async () => {
    const { useCase } = buildHarness({ anonymous: true });
    await expect(useCase.execute(userCommand())).rejects.toThrow(
      /does not yet support anonymous/i,
    );
  });

  it('rejects skill activation (not yet supported on the runtime path)', async () => {
    const { useCase } = buildHarness();
    const command = userCommand(
      new RunUserInput('Hi', [], 'skill-1' as unknown as UUID),
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      /does not yet support skill/i,
    );
  });
});
