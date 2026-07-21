import { MockProvider, textTurn, toolCallTurn } from '@ayunis/agent-runtime';
import type { Tool as RuntimeTool } from '@ayunis/agent-runtime';
import type { ProviderChunk } from '@ayunis/inference';
import type { UUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import type { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import type { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import type { ResolveModelProviderUseCase } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import type { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import type { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import type { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
import type { ToolAssemblyService } from '../../services/tool-assembly.service';
import type { MessageCleanupService } from '../../services/message-cleanup.service';
import type { BackendToolAdapter } from '../../agent-runtime/backend-tool.adapter';
import type { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import { PersistenceHookFactory } from '../../agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from '../../agent-runtime/hooks/usage-hook.factory';
import { SkillActivationHookFactory } from '../../agent-runtime/hooks/skill-activation-hook.factory';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from '../../../domain/run-pii-masks-update.entity';
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
  createToolResult: jest.Mock;
  anonymize: jest.Mock;
  activateOnThread: jest.Mock;
  createUser: jest.Mock;
  provider: MockProvider;
}

interface HarnessOptions {
  anonymous?: boolean;
  turns?: readonly (readonly ProviderChunk[])[];
  runtimeTools?: RuntimeTool[];
}

function buildHarness(overrides: HarnessOptions = {}): Harness {
  const model = {
    name: 'claude',
    provider: 'anthropic',
    canVision: false,
    canUseTools: (overrides.runtimeTools?.length ?? 0) > 0,
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
    getLastMessage: () => undefined,
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
    findActiveSkills: jest.fn().mockResolvedValue([]),
  } as unknown as ToolAssemblyService;
  const backendToolAdapter = {
    toRuntimeTools: jest.fn().mockReturnValue(overrides.runtimeTools ?? []),
  } as unknown as BackendToolAdapter;
  const activateOnThread = jest.fn().mockResolvedValue({
    instructions: 'Be a helpful clerk',
    skillName: 'Clerk',
  });
  const skillActivationService = {
    activateOnThread,
  } as unknown as SkillActivationService;
  const skillActivationHookFactory = new SkillActivationHookFactory(
    findThreadUseCase,
    toolAssemblyService,
    backendToolAdapter,
  );
  const anonymize = jest.fn().mockResolvedValue({
    anonymizedText: 'Hi {{pii:PERSON_1}}',
    masks: [{ token: '{{pii:PERSON_1}}' }],
  });
  const anonymizeTextForThreadUseCase = {
    execute: anonymize,
  } as unknown as AnonymizeTextForThreadUseCase;
  const createToolResult = jest
    .fn()
    .mockResolvedValue({ id: 'tool-result-msg' });
  const createToolResultMessageUseCase = {
    execute: createToolResult,
  } as unknown as CreateToolResultMessageUseCase;
  const userMessage = { id: 'user-msg', threadId } as unknown as UserMessage;
  const createUser = jest.fn().mockResolvedValue(userMessage);
  const createUserMessageUseCase = {
    execute: createUser,
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
  const provider = new MockProvider(overrides.turns ?? [textTurn('Hello')]);
  const resolveModelProviderUseCase = {
    execute: jest.fn().mockResolvedValue(provider),
  } as unknown as ResolveModelProviderUseCase;
  const cleanup = jest.fn().mockResolvedValue(undefined);
  const messageCleanupService = {
    cleanupTrailingNonAssistantMessages: cleanup,
  } as unknown as MessageCleanupService;
  const eventEmitter = {
    emitAsync: jest.fn().mockResolvedValue([]),
  } as unknown as EventEmitter2;

  const save = jest.fn().mockResolvedValue(undefined);
  const flushToolResult = jest.fn().mockResolvedValue(undefined);
  const persistenceHookFactory = new PersistenceHookFactory(
    { execute: save } as never,
    { execute: flushToolResult } as never,
  );
  const collectUsage = inferenceUsageGuard.collectUsage as jest.Mock;
  const usageHookFactory = new UsageHookFactory(inferenceUsageGuard);

  const useCase = new ExecuteRunViaRuntimeUseCase(
    contextService,
    findThreadUseCase,
    inferenceUsageGuard,
    toolAssemblyService,
    backendToolAdapter,
    skillActivationService,
    anonymizeTextForThreadUseCase,
    createUserMessageUseCase,
    createToolResultMessageUseCase,
    addMessageToThreadUseCase,
    mapMessagesToInferenceUseCase,
    resolveModelProviderUseCase,
    messageCleanupService,
    persistenceHookFactory,
    usageHookFactory,
    skillActivationHookFactory,
    eventEmitter,
  );

  return {
    useCase,
    save,
    collectUsage,
    cleanup,
    createToolResult: flushToolResult,
    anonymize,
    activateOnThread,
    createUser,
    provider,
  };
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

  it('executes a tool in-loop and persists the grouped tool result', async () => {
    const execute = jest.fn().mockResolvedValue('sunny in Berlin');
    const searchTool = {
      name: 'get_weather',
      description: 'weather',
      parameters: { type: 'object' },
      execute,
    };
    const { useCase, save, createToolResult } = buildHarness({
      runtimeTools: [searchTool],
      turns: [
        toolCallTurn({
          id: 'c1',
          name: 'get_weather',
          input: { city: 'Berlin' },
        }),
        textTurn('It is sunny.'),
      ],
    });

    const items = await drain(await useCase.execute(userCommand()));

    // the tool ran in-loop
    expect(execute).toHaveBeenCalledTimes(1);
    // two assistant turns persisted (tool call + final text), grouped tool result once
    expect(save).toHaveBeenCalledTimes(2);
    expect(createToolResult).toHaveBeenCalledTimes(1);
    const finalText = items
      .filter((i): i is AssistantMessage => i instanceof AssistantMessage)
      .map((m) => (m.content[0] as TextMessageContent)?.text)
      .filter(Boolean)
      .pop();
    expect(finalText).toBe('It is sunny.');

    // the streamed and persisted tool-result copies share a deterministic id
    const streamedToolResult = items.find(
      (i): i is ToolResultMessage => i instanceof ToolResultMessage,
    );
    const persistedCommand = createToolResult.mock.calls[0][0] as {
      id?: string;
    };
    expect(streamedToolResult).toBeDefined();
    expect(persistedCommand.id).toBe(streamedToolResult!.id);
  });

  it('rejects a tool-result input with no pending tool call', async () => {
    const { useCase } = buildHarness();
    const command = new ExecuteRunCommand({
      threadId,
      input: new RunToolResultInput('t1', 'search', 'result'),
    });
    // the (empty) thread has no assistant tool_use to attach the result to;
    // the error surfaces when the stream is drained
    await expect(drain(await useCase.execute(command))).rejects.toThrow(
      /No pending tool call/i,
    );
  });

  it('anonymizes the user message and streams the mask dictionary first', async () => {
    const { useCase, anonymize } = buildHarness({ anonymous: true });

    const items = await drain(await useCase.execute(userCommand()));

    expect(anonymize).toHaveBeenCalledTimes(1);
    // masks are streamed before the (redacted) user message
    expect(items[0]).toBeInstanceOf(RunPiiMasksUpdate);
    expect(items[1]).toMatchObject({ id: 'user-msg' });
  });

  it('activates a requested skill before the run and folds in its instructions', async () => {
    const { useCase, activateOnThread, createUser } = buildHarness();

    const command = userCommand(
      new RunUserInput('Hi', [], 'skill-1' as unknown as UUID),
    );
    await drain(await useCase.execute(command));

    expect(activateOnThread).toHaveBeenCalledWith('skill-1', expect.anything());
    // the skill instructions are folded into the created user message
    expect(createUser.mock.calls[0][0]).toMatchObject({
      skillInstructions: 'Be a helpful clerk',
    });
  });

  it('accepts a skill-only launch with empty text (no images)', async () => {
    const { useCase, createUser } = buildHarness();

    const command = userCommand(
      new RunUserInput('', [], 'skill-1' as unknown as UUID),
    );
    // must not throw a validation error — the skill instructions are valid input
    await drain(await useCase.execute(command));

    expect(createUser.mock.calls[0][0]).toMatchObject({
      skillInstructions: 'Be a helpful clerk',
    });
  });

  it('appends the already-activated-skill note to the system prompt', async () => {
    const { useCase, provider } = buildHarness();

    const command = userCommand(
      new RunUserInput('Hi', [], 'skill-1' as unknown as UUID),
    );
    await drain(await useCase.execute(command));

    expect(provider.requests[0].instructions).toContain(
      '<already_activated_skill>',
    );
    expect(provider.requests[0].instructions).toContain('"Clerk"');
  });
});
