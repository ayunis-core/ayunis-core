import { MockProvider, textTurn, toolCallTurn } from '@ayunis/agent-runtime';
import type {
  ProviderRequest,
  Tool as RuntimeTool,
} from '@ayunis/agent-runtime';
import type { ProviderChunk } from '@ayunis/inference';
import type { UUID } from 'crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { ThreadMessageAddedEvent } from 'src/domain/threads/application/events/thread-message-added.event';
import type { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import type { ResolveModelProviderUseCase } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import type { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import type { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import type { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
import type { ToolAssemblyService } from '../../services/tool-assembly.service';
import type { MessageCleanupService } from '../../services/message-cleanup.service';
import { ToolResultCollectorService } from '../../services/tool-result-collector.service';
import type { BackendToolAdapter } from '../../agent-runtime/backend-tool.adapter';
import type { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import { PersistenceHookFactory } from '../../agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from '../../agent-runtime/hooks/usage-hook.factory';
import { ToolUsageHookFactory } from '../../agent-runtime/hooks/tool-usage-hook.factory';
import { ToolUsedEvent } from '../../events/tool-used.event';
import { RunMaxIterationsReachedError } from '../../runs.errors';
import { SkillActivationHookFactory } from '../../agent-runtime/hooks/skill-activation-hook.factory';
import { ContextBudgetHookFactory } from '../../agent-runtime/hooks/context-budget-hook.factory';
import { CompleteTurnSelector } from '../../agent-runtime/complete-turn-selector';
import type { RuntimeHistoryMaterializer } from '../../agent-runtime/runtime-history-materializer';
import type { RuntimeModelProviderDecorator } from '../../agent-runtime/runtime-model-provider.decorator';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from '../../../domain/run-pii-masks-update.entity';
import {
  RunUserInput,
  RunToolResultInput,
} from '../../../domain/run-input.entity';
import { ExecuteRunCommand } from '../execute-run/execute-run.command';
import { RunContextBudgetExceededError } from '../../runs.errors';
import { ExecuteRunViaRuntimeUseCase } from './execute-run-via-runtime.use-case';

const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
const userId = '223e4567-e89b-12d3-a456-426614174000' as UUID;
const orgId = '323e4567-e89b-12d3-a456-426614174000' as UUID;
const integrationId = '423e4567-e89b-12d3-a456-426614174000' as UUID;

interface Harness {
  useCase: ExecuteRunViaRuntimeUseCase;
  findThread: jest.Mock;
  save: jest.Mock;
  collectUsage: jest.Mock;
  cleanup: jest.Mock;
  createToolResult: jest.Mock;
  createSeedToolResult: jest.Mock;
  emitAsync: jest.Mock;
  anonymize: jest.Mock;
  activateOnThread: jest.Mock;
  createUser: jest.Mock;
  provider: MockProvider;
  providerSignal: () => AbortSignal | undefined;
  countTokens: jest.Mock;
}

interface HarnessOptions {
  anonymous?: boolean;
  turns?: readonly (readonly ProviderChunk[])[];
  runtimeTools?: RuntimeTool[];
  backendTools?: BackendTool[];
  rebuiltRuntimeTools?: RuntimeTool[];
  rebuiltBackendTools?: BackendTool[];
  lastMessage?: Message;
  toolResultCollector?: ToolResultCollectorService;
  providerRejects?: boolean;
  providerStream?: (request: ProviderRequest) => AsyncIterable<ProviderChunk>;
  tokensPerMessage?: number;
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
    getLastMessage: () => overrides.lastMessage,
  } as unknown as Thread;

  const contextService = {
    get: jest.fn((key?: string | symbol) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      return undefined;
    }),
  } as unknown as ContextService;
  const eventEmitter = {
    emitAsync: jest.fn().mockResolvedValue([]),
  } as unknown as EventEmitter2;
  const emitAsync = eventEmitter.emitAsync as jest.Mock;

  const findThread = jest.fn().mockResolvedValue({ thread });
  const findThreadUseCase = {
    execute: findThread,
  } as unknown as FindThreadUseCase;
  const inferenceUsageGuard = {
    preflight: jest.fn().mockResolvedValue(undefined),
    collectUsage: jest.fn(),
  } as unknown as jest.Mocked<InferenceUsageGuard>;
  const initialRunContext = {
    tools: overrides.backendTools ?? [],
    instructions: 'system prompt',
  };
  const buildRunContext = jest.fn().mockResolvedValue(initialRunContext);
  if (overrides.rebuiltBackendTools) {
    buildRunContext
      .mockResolvedValueOnce(initialRunContext)
      .mockResolvedValueOnce({
        tools: overrides.rebuiltBackendTools,
        instructions: 'activated skill prompt',
      });
  }
  const toolAssemblyService = {
    buildRunContext,
    findActiveSkills: jest.fn().mockResolvedValue([]),
  } as unknown as ToolAssemblyService;
  const toRuntimeTools = jest
    .fn()
    .mockReturnValue(overrides.runtimeTools ?? []);
  if (overrides.rebuiltRuntimeTools) {
    toRuntimeTools
      .mockReturnValueOnce(overrides.runtimeTools ?? [])
      .mockReturnValueOnce(overrides.rebuiltRuntimeTools);
  }
  const backendToolAdapter = {
    toRuntimeTools,
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
  const createToolResult = jest.fn().mockImplementation((command) =>
    Promise.resolve(
      new ToolResultMessage({
        id: command.id,
        threadId: command.threadId,
        content: command.content,
      }),
    ),
  );
  const createToolResultMessageUseCase = {
    execute: createToolResult,
  } as unknown as CreateToolResultMessageUseCase;
  const userMessage = new UserMessage({
    id: 'user-msg' as UUID,
    threadId,
    content: [],
  });
  const createUser = jest.fn().mockResolvedValue(userMessage);
  const createUserMessageUseCase = {
    execute: createUser,
  } as unknown as CreateUserMessageUseCase;
  const addMessageToThreadUseCase = new AddMessageToThreadUseCase(
    contextService,
    eventEmitter,
  );
  const runtimeHistoryMaterializer = {
    materialize: jest
      .fn()
      .mockResolvedValue([
        { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      ]),
  } as unknown as RuntimeHistoryMaterializer;
  const countTokens = jest
    .fn()
    .mockReturnValue(overrides.tokensPerMessage ?? 1);
  const completeTurnSelector = new CompleteTurnSelector({
    execute: countTokens,
  } as unknown as CountTokensUseCase);
  const contextBudgetHookFactory = new ContextBudgetHookFactory(
    completeTurnSelector,
  );
  const provider = new MockProvider(overrides.turns ?? [textTurn('Hello')]);
  if (overrides.providerStream) {
    provider.stream = overrides.providerStream;
  }
  let providerSignal: AbortSignal | undefined;
  const streamProvider = provider.stream.bind(provider);
  provider.stream = (providerRequest) => {
    providerSignal = providerRequest.signal;
    return streamProvider(providerRequest);
  };
  const resolveModelProviderUseCase = {
    execute: overrides.providerRejects
      ? jest.fn().mockRejectedValue(new Error('provider down'))
      : jest.fn().mockResolvedValue(provider),
  } as unknown as ResolveModelProviderUseCase;
  const runtimeModelProviderDecorator = {
    decorate: jest.fn((resolvedProvider) => resolvedProvider),
  } as unknown as RuntimeModelProviderDecorator;
  const cleanup = jest.fn().mockResolvedValue(undefined);
  const messageCleanupService = {
    cleanupTrailingNonAssistantMessages: cleanup,
  } as unknown as MessageCleanupService;
  const save = jest
    .fn()
    .mockImplementation((command) => Promise.resolve(command.message));
  const flushToolResult = jest.fn().mockImplementation((command) =>
    Promise.resolve(
      new ToolResultMessage({
        id: command.id,
        threadId: command.threadId,
        content: command.content,
      }),
    ),
  );
  const persistenceHookFactory = new PersistenceHookFactory(
    { execute: save } as never,
    { execute: flushToolResult } as never,
    addMessageToThreadUseCase,
  );
  const collectUsage = inferenceUsageGuard.collectUsage as jest.Mock;
  const usageHookFactory = new UsageHookFactory(inferenceUsageGuard);
  const toolUsageHookFactory = new ToolUsageHookFactory(eventEmitter);
  const toolResultCollector = overrides.toolResultCollector ?? {
    collectToolResults: jest
      .fn()
      .mockResolvedValue({ contents: [], piiMasks: null }),
  };

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
    runtimeHistoryMaterializer,
    resolveModelProviderUseCase,
    runtimeModelProviderDecorator,
    messageCleanupService,
    persistenceHookFactory,
    usageHookFactory,
    skillActivationHookFactory,
    eventEmitter,
    toolResultCollector as ToolResultCollectorService,
    toolUsageHookFactory,
    contextBudgetHookFactory,
  );

  return {
    useCase,
    findThread,
    save,
    collectUsage,
    cleanup,
    createToolResult: flushToolResult,
    createSeedToolResult: createToolResult,
    emitAsync,
    anonymize,
    activateOnThread,
    createUser,
    provider,
    providerSignal: () => providerSignal,
    countTokens,
  };
}

async function drain(
  gen: AsyncIterable<RunStreamItem>,
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
  it('wraps unexpected preparation failures in the runs error family', async () => {
    const { useCase, findThread } = buildHarness();
    findThread.mockRejectedValueOnce(new Error('database connection lost'));

    await expect(useCase.execute(userCommand())).rejects.toMatchObject({
      code: 'UNEXPECTED_RUN_ERROR',
      statusCode: 500,
    });
  });

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
    expect(collectUsage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ inputTokens: expect.any(Number) }),
      savedMessage.id,
    );
    expect(collectUsage).toHaveBeenCalledTimes(1);
  });

  it('preserves the persisted transcript when the tool-failure breaker trips', async () => {
    const failingTool = {
      name: 'create_document',
      description: 'Creates a document',
      parameters: { type: 'object', properties: {} },
      execute: jest
        .fn()
        .mockRejectedValue(
          new Error("Invalid parameters: missing required parameter 'title'"),
        ),
    };
    const failingCall = {
      id: 'doc-1',
      name: 'create_document',
      input: { content: '<h1>Bericht</h1>' },
    };
    const { useCase, cleanup } = buildHarness({
      runtimeTools: [failingTool],
      turns: [
        toolCallTurn(failingCall),
        toolCallTurn(failingCall),
        toolCallTurn(failingCall),
      ],
    });

    await expect(
      drain(await useCase.execute(userCommand())),
    ).rejects.toMatchObject({ code: 'RUN_TOOL_EXECUTION_FAILED' });

    // Like max-iterations, the completed tool phases stay — cleanup would
    // delete the failed turn and re-arm its pending tool calls.
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('fails and cleans up when the provider returns no assistant content', async () => {
    const { useCase, save, collectUsage, cleanup } = buildHarness({
      turns: [
        [
          {
            finishReason: 'stop',
            usage: { inputTokens: 17, outputTokens: 0 },
          },
        ],
      ],
    });

    await expect(
      drain(await useCase.execute(userCommand())),
    ).rejects.toMatchObject({
      code: 'RUN_EXECUTION_FAILED',
      message: 'Run execution failed: Agent runtime failed',
    });
    expect(save).not.toHaveBeenCalled();
    expect(collectUsage).toHaveBeenCalledTimes(1);
    expect(collectUsage).toHaveBeenCalledWith(
      expect.anything(),
      { inputTokens: 17, outputTokens: 0 },
      expect.any(String),
    );
    expect(cleanup).toHaveBeenCalledWith(threadId);
  });

  it('collects usage once before surfacing assistant persistence failure', async () => {
    const { useCase, save, collectUsage } = buildHarness({
      turns: [
        textTurn('Billable response', { inputTokens: 23, outputTokens: 5 }),
      ],
    });
    save.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(
      drain(await useCase.execute(userCommand())),
    ).rejects.toMatchObject({ code: 'RUN_EXECUTION_FAILED' });

    expect(collectUsage).toHaveBeenCalledTimes(1);
    expect(collectUsage).toHaveBeenCalledWith(
      expect.anything(),
      { inputTokens: 23, outputTokens: 5 },
      expect.any(String),
    );
  });

  it('passes the request cancellation signal to the runtime provider call', async () => {
    const controller = new AbortController();
    const { useCase, providerSignal } = buildHarness();
    const command = new ExecuteRunCommand({
      threadId,
      input: new RunUserInput('Hi there'),
      signal: controller.signal,
    });

    await drain(await useCase.execute(command));

    expect(providerSignal()).toBe(controller.signal);
  });

  it('cleans up an orphaned tool-use message when cancellation follows persistence', async () => {
    const controller = new AbortController();
    const lookupTool = {
      name: 'search_municipal_records',
      description: 'Search municipal records',
      parameters: { type: 'object' },
      execute: jest.fn().mockResolvedValue('record found'),
    };
    const { useCase, save, cleanup } = buildHarness({
      runtimeTools: [lookupTool],
      turns: [
        toolCallTurn({
          id: 'records-1',
          name: lookupTool.name,
          input: { query: '2026 budget amendment' },
        }),
      ],
    });
    save.mockImplementationOnce(async (saveCommand) => {
      controller.abort();
      return saveCommand.message;
    });
    const command = new ExecuteRunCommand({
      threadId,
      input: new RunUserInput('Find the budget amendment'),
      signal: controller.signal,
    });

    await drain(await useCase.execute(command));

    expect(cleanup).toHaveBeenCalledWith(threadId);
  });

  it('persists partial text before cleanup when the provider fails', async () => {
    const order: string[] = [];
    const { useCase, save, cleanup } = buildHarness({
      providerStream: async function* () {
        yield { textDelta: 'Partial answer' };
        throw new Error('provider disconnected');
      },
    });
    save.mockImplementation(async (saveCommand) => {
      order.push('save');
      return saveCommand.message;
    });
    cleanup.mockImplementation(async () => {
      order.push('cleanup');
    });

    await expect(drain(await useCase.execute(userCommand()))).rejects.toThrow();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].message.content).toMatchObject([
      { text: 'Partial answer' },
    ]);
    expect(cleanup).toHaveBeenCalledWith(threadId);
    expect(order).toEqual(['save', 'cleanup']);
  });

  it('persists partial text when client cancellation interrupts the model', async () => {
    const controller = new AbortController();
    const { useCase, save, cleanup } = buildHarness({
      providerStream: async function* () {
        controller.abort();
        yield { textDelta: 'Partial answer' };
        yield { textDelta: 'not retained' };
      },
    });
    const command = new ExecuteRunCommand({
      threadId,
      input: new RunUserInput('Hi there'),
      signal: controller.signal,
    });

    await drain(await useCase.execute(command));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].message.content).toMatchObject([
      { text: 'Partial answer' },
    ]);
    expect(cleanup).toHaveBeenCalledWith(threadId);
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

  it('emits the legacy message-added sequence exactly once for a runtime tool loop', async () => {
    const runtimeTool = {
      name: 'get_weather',
      description: 'weather',
      parameters: { type: 'object' },
      execute: jest.fn().mockResolvedValue('sunny'),
    };
    const { useCase, emitAsync } = buildHarness({
      runtimeTools: [runtimeTool],
      turns: [
        toolCallTurn({ id: 'c1', name: runtimeTool.name, input: {} }),
        textTurn('It is sunny.'),
      ],
    });

    await drain(await useCase.execute(userCommand()));

    const additions = emitAsync.mock.calls.filter(
      ([eventName]) => eventName === ThreadMessageAddedEvent.EVENT_NAME,
    );
    expect(additions).toEqual(
      [1, 2, 3, 4].map((messageCount) => [
        ThreadMessageAddedEvent.EVENT_NAME,
        new ThreadMessageAddedEvent(userId, orgId, threadId, messageCount),
      ]),
    );
  });

  it('does not stream a grouped tool result when its persistence fails', async () => {
    const execute = jest.fn().mockResolvedValue('classified record');
    const lookupTool = {
      name: 'lookup_record',
      description: 'Look up a municipal record',
      parameters: { type: 'object' },
      execute,
    };
    const { useCase, createToolResult } = buildHarness({
      runtimeTools: [lookupTool],
      turns: [
        toolCallTurn({ id: 'record-1', name: lookupTool.name, input: {} }),
      ],
    });
    createToolResult.mockRejectedValue(new Error('database unavailable'));
    const items: RunStreamItem[] = [];

    await expect(async () => {
      for await (const item of await useCase.execute(userCommand())) {
        items.push(item);
      }
    }).rejects.toBeDefined();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(items).not.toContainEqual(expect.any(ToolResultMessage));
  });

  it('retains completed tool results when the runtime reaches its iteration cap', async () => {
    const execute = jest.fn().mockResolvedValue('municipal record found');
    const lookupTool = {
      name: 'search_municipal_records',
      description: 'Search municipal records',
      parameters: { type: 'object' },
      execute,
    };
    const turns = Array.from({ length: 20 }, (_, iteration) =>
      toolCallTurn({
        id: `records-${iteration}`,
        name: lookupTool.name,
        input: { query: `budget amendment ${iteration + 1}` },
      }),
    );
    const { useCase, createToolResult, cleanup } = buildHarness({
      runtimeTools: [lookupTool],
      turns,
    });

    await expect(
      drain(await useCase.execute(userCommand())),
    ).rejects.toBeInstanceOf(RunMaxIterationsReachedError);

    expect(execute).toHaveBeenCalledTimes(20);
    expect(createToolResult).toHaveBeenCalledTimes(20);
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('cleans up the final tool-use turn when its max-iteration flush fails', async () => {
    const execute = jest.fn().mockResolvedValue('municipal record found');
    const lookupTool = {
      name: 'search_municipal_records',
      description: 'Search municipal records',
      parameters: { type: 'object' },
      execute,
    };
    const turns = Array.from({ length: 20 }, (_, iteration) =>
      toolCallTurn({
        id: `records-${iteration}`,
        name: lookupTool.name,
        input: { query: `budget amendment ${iteration + 1}` },
      }),
    );
    const { useCase, createToolResult, cleanup } = buildHarness({
      runtimeTools: [lookupTool],
      turns,
    });
    createToolResult.mockImplementation(async (createCommand) => {
      if (createToolResult.mock.calls.length === 20) {
        throw new Error('database unavailable');
      }
      return new ToolResultMessage({
        id: createCommand.id,
        threadId: createCommand.threadId,
        content: createCommand.content,
      });
    });

    await expect(drain(await useCase.execute(userCommand()))).rejects.toThrow(
      'Run execution failed',
    );

    expect(execute).toHaveBeenCalledTimes(20);
    expect(createToolResult).toHaveBeenCalledTimes(21);
    expect(cleanup).toHaveBeenCalledWith(threadId);
  });

  it('includes MCP integration metadata in streamed and persisted tool calls', async () => {
    const toolName = 'search_municipal_records';
    const integration = {
      id: integrationId,
      name: 'Municipal Records',
      logoUrl: 'https://example.com/municipal-records.svg',
    };
    const backendTool = new McpIntegrationTool(
      new McpTool(
        toolName,
        'Search municipal records',
        { type: 'object' },
        integrationId,
      ),
      false,
      integration.name,
      integration.logoUrl,
    );
    const runtimeTool = {
      name: toolName,
      description: 'Search municipal records',
      parameters: { type: 'object' },
      execute: jest.fn().mockResolvedValue('Record found'),
    };
    const { useCase, save } = buildHarness({
      backendTools: [backendTool],
      runtimeTools: [runtimeTool],
      turns: [
        toolCallTurn({ id: 'records-1', name: toolName, input: {} }),
        textTurn('I found the record.'),
      ],
    });

    const items = await drain(await useCase.execute(userCommand()));

    const streamedToolUse = items
      .filter(
        (item): item is AssistantMessage => item instanceof AssistantMessage,
      )
      .flatMap((message) => message.content)
      .find(
        (content): content is ToolUseMessageContent =>
          content instanceof ToolUseMessageContent,
      );
    const persistedToolUse = (
      save.mock.calls[0][0].message as AssistantMessage
    ).content.find(
      (content): content is ToolUseMessageContent =>
        content instanceof ToolUseMessageContent,
    );
    expect([
      streamedToolUse?.integration,
      persistedToolUse?.integration,
    ]).toEqual([integration, integration]);
  });

  it('includes metadata for an MCP tool added by skill activation', async () => {
    const toolName = 'search_procurement_system';
    const integration = {
      id: integrationId,
      name: 'Procurement System',
      logoUrl: 'https://example.com/procurement-system.svg',
    };
    const activateBackendTool = {
      name: 'activate_skill',
    } as unknown as BackendTool;
    const activatedBackendTool = new McpIntegrationTool(
      new McpTool(
        toolName,
        'Search procurement notices',
        { type: 'object' },
        integrationId,
      ),
      false,
      integration.name,
      integration.logoUrl,
    );
    const activateRuntimeTool = {
      name: 'activate_skill',
      description: 'Activate a skill',
      parameters: { type: 'object' },
      execute: jest.fn().mockResolvedValue('Skill activated'),
    };
    const activatedRuntimeTool = {
      name: toolName,
      description: 'Search procurement notices',
      parameters: { type: 'object' },
      execute: jest.fn().mockResolvedValue('Notice found'),
    };
    const { useCase, save } = buildHarness({
      backendTools: [activateBackendTool],
      runtimeTools: [activateRuntimeTool],
      rebuiltBackendTools: [activateBackendTool, activatedBackendTool],
      rebuiltRuntimeTools: [activateRuntimeTool, activatedRuntimeTool],
      turns: [
        toolCallTurn({ id: 'activate-1', name: 'activate_skill', input: {} }),
        toolCallTurn({ id: 'procurement-1', name: toolName, input: {} }),
        textTurn('I found the procurement notice.'),
      ],
    });

    const items = await drain(await useCase.execute(userCommand()));

    const streamedToolUse = items
      .filter(
        (item): item is AssistantMessage => item instanceof AssistantMessage,
      )
      .flatMap((message) => message.content)
      .find(
        (content): content is ToolUseMessageContent =>
          content instanceof ToolUseMessageContent && content.name === toolName,
      );
    const persistedToolUse = save.mock.calls
      .map((call) => call[0].message as AssistantMessage)
      .flatMap((message) => message.content)
      .find(
        (content): content is ToolUseMessageContent =>
          content instanceof ToolUseMessageContent && content.name === toolName,
      );
    expect([
      streamedToolUse?.integration,
      persistedToolUse?.integration,
    ]).toEqual([integration, integration]);
  });

  it('executes an executable sibling when continuing a display-only tool call', async () => {
    const displayTool = { name: 'bar_chart' } as unknown as BackendTool;
    const searchTool = { name: 'internet_search' } as unknown as BackendTool;
    const lastMessage = {
      content: [
        new ToolUseMessageContent('chart-1', 'bar_chart', { title: 'Budget' }),
        new ToolUseMessageContent('search-1', 'internet_search', {
          query: 'Berlin budget 2026',
        }),
      ],
    } as unknown as Message;
    const executeTool = jest.fn().mockResolvedValue('Berlin budget results');
    const checkCapabilities = jest.fn(({ tool }: { tool: BackendTool }) => ({
      isDisplayable: tool.name === 'bar_chart',
      isExecutable: tool.name === 'internet_search',
    }));
    const collector = new ToolResultCollectorService(
      { execute: executeTool } as never,
      { execute: checkCapabilities } as never,
      { execute: jest.fn() } as never,
      { get: jest.fn().mockReturnValue(userId) } as never,
      { emitAsync: jest.fn().mockResolvedValue([]) } as never,
    );
    const { useCase, createSeedToolResult } = buildHarness({
      backendTools: [displayTool, searchTool],
      lastMessage,
      toolResultCollector: collector,
    });
    const command = new ExecuteRunCommand({
      threadId,
      input: new RunToolResultInput('chart-1', 'bar_chart', 'Chart displayed'),
    });

    await drain(await useCase.execute(command));

    const persisted = createSeedToolResult.mock.calls[0][0] as {
      content: Array<{ toolId: string; result: string }>;
    };
    expect(persisted.content).toEqual([
      expect.objectContaining({ toolId: 'chart-1', result: 'Chart displayed' }),
      expect.objectContaining({
        toolId: 'search-1',
        result: 'Berlin budget results',
      }),
    ]);
    expect(executeTool).toHaveBeenCalledTimes(1);
  });

  it('does not execute stale pending tools when accepting a new user message', async () => {
    const displayTool = { name: 'bar_chart' } as unknown as BackendTool;
    const searchTool = { name: 'internet_search' } as unknown as BackendTool;
    const lastMessage = {
      content: [
        new ToolUseMessageContent('chart-1', 'bar_chart', { title: 'Budget' }),
        new ToolUseMessageContent('search-1', 'internet_search', {
          query: 'Berlin budget 2026',
        }),
      ],
    } as unknown as Message;
    const executeTool = jest.fn().mockResolvedValue('Berlin budget results');
    const collector = new ToolResultCollectorService(
      { execute: executeTool } as never,
      {
        execute: jest.fn(({ tool }: { tool: BackendTool }) => ({
          isDisplayable: tool.name === 'bar_chart',
          isExecutable: tool.name === 'internet_search',
        })),
      } as never,
      { execute: jest.fn() } as never,
      { get: jest.fn().mockReturnValue(userId) } as never,
      { emitAsync: jest.fn().mockResolvedValue([]) } as never,
    );
    const { useCase } = buildHarness({
      backendTools: [displayTool, searchTool],
      lastMessage,
      toolResultCollector: collector,
    });

    const items = await drain(
      await useCase.execute(userCommand(new RunUserInput('What comes next?'))),
    );

    expect(executeTool).not.toHaveBeenCalled();
    expect(items[0]).toBeInstanceOf(UserMessage);
  });

  it('persists a display acknowledgement in the originating run', async () => {
    const displayTool = {
      name: 'bar_chart',
      description: 'Display a bar chart',
      parameters: { type: 'object' },
    };
    const { useCase, provider } = buildHarness({
      backendTools: [displayTool as unknown as BackendTool],
      runtimeTools: [displayTool],
      turns: [
        toolCallTurn({
          id: 'chart-1',
          name: 'bar_chart',
          input: { title: 'Budget' },
        }),
      ],
    });

    const items = await drain(await useCase.execute(userCommand()));

    const toolResult = items.find(
      (item): item is ToolResultMessage => item instanceof ToolResultMessage,
    );
    expect(toolResult?.content).toEqual([
      expect.objectContaining({
        toolId: 'chart-1',
        toolName: 'bar_chart',
        result: 'Tool has been displayed successfully',
      }),
    ]);
    expect(provider.requests).toHaveLength(1);
  });

  it('emits tool usage for an executable tool invocation', async () => {
    const executableTool = {
      name: 'internet_search',
      description: 'search',
      parameters: { type: 'object' },
      execute: jest.fn().mockResolvedValue('Berlin budget results'),
    };
    const { useCase, emitAsync } = buildHarness({
      runtimeTools: [executableTool],
      turns: [
        toolCallTurn({
          id: 'search-1',
          name: 'internet_search',
          input: { query: 'Berlin budget 2026' },
        }),
        textTurn('The budget results are ready.'),
      ],
    });

    await drain(await useCase.execute(userCommand()));

    expect(emitAsync).toHaveBeenCalledWith(
      ToolUsedEvent.EVENT_NAME,
      new ToolUsedEvent(userId, orgId, 'internet_search'),
    );
  });

  it('re-applies the context budget before every inference iteration', async () => {
    const echo = {
      name: 'echo',
      description: 'echo',
      parameters: { type: 'object' },
      execute: jest.fn().mockResolvedValue('echoed'),
    };
    const { useCase, countTokens, provider } = buildHarness({
      runtimeTools: [echo],
      turns: [
        toolCallTurn({ id: 'echo-1', name: 'echo', input: { value: 'hi' } }),
        textTurn('Done'),
      ],
    });

    await drain(await useCase.execute(userCommand()));

    expect(provider.requests).toHaveLength(2);
    expect(countTokens).toHaveBeenCalledTimes(4);
  });

  it('does not call the provider when the latest turn exceeds the budget', async () => {
    const { useCase, provider } = buildHarness({ tokensPerMessage: 80_001 });

    await expect(
      drain(await useCase.execute(userCommand())),
    ).rejects.toBeInstanceOf(RunContextBudgetExceededError);
    expect(provider.requests).toHaveLength(0);
  });

  it('cleans up trailing non-assistant messages when the run fails', async () => {
    const { useCase, cleanup } = buildHarness({ providerRejects: true });

    await expect(drain(await useCase.execute(userCommand()))).rejects.toThrow();
    expect(cleanup).toHaveBeenCalledWith(threadId);
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

  it('anonymizes a display result and uses the pending tool name before persistence', async () => {
    const lastMessage = {
      content: [
        new ToolUseMessageContent('chart-1', 'bar_chart', { title: 'Budget' }),
      ],
    } as unknown as Message;
    const collectToolResults = jest.fn(
      ({ input }: { input: RunToolResultInput }) => ({
        contents: [
          new ToolResultMessageContent(
            input.toolId,
            input.toolName,
            input.result,
          ),
        ],
        piiMasks: null,
      }),
    );
    const { useCase, createSeedToolResult } = buildHarness({
      anonymous: true,
      lastMessage,
      toolResultCollector: { collectToolResults } as never,
    });
    const command = new ExecuteRunCommand({
      threadId,
      input: new RunToolResultInput(
        'chart-1',
        'forged_tool_name',
        'Chart for Jane Doe',
      ),
    });

    const items = await drain(await useCase.execute(command));

    expect(collectToolResults.mock.calls[0][0].input).toMatchObject({
      toolId: 'chart-1',
      toolName: 'bar_chart',
      result: 'Hi {{pii:PERSON_1}}',
    });
    expect(createSeedToolResult.mock.calls[0][0].content[0]).toMatchObject({
      toolName: 'bar_chart',
      result: 'Hi {{pii:PERSON_1}}',
    });
    expect(items[0]).toBeInstanceOf(RunPiiMasksUpdate);
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
    const { useCase, activateOnThread, createUser, provider } = buildHarness();

    const command = userCommand(
      new RunUserInput('Hi', [], 'skill-1' as unknown as UUID),
    );
    await drain(await useCase.execute(command));

    expect(activateOnThread).toHaveBeenCalledWith('skill-1', expect.anything());
    // the skill instructions are folded into the created user message
    expect(createUser.mock.calls[0][0]).toMatchObject({
      skillInstructions: 'Be a helpful clerk',
    });
    expect(provider.requests[0].instructions).toContain(
      'Skill "Clerk" has already been activated on this thread.',
    );
  });

  it('accepts a skill-only quick action without text or images', async () => {
    const { useCase, createUser } = buildHarness();
    const command = userCommand(
      new RunUserInput('', [], 'skill-1' as unknown as UUID),
    );

    await drain(await useCase.execute(command));

    expect(createUser.mock.calls[0][0]).toMatchObject({
      text: '',
      pendingImages: [],
      skillInstructions: 'Be a helpful clerk',
    });
  });
});
