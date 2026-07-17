import {
  run,
  RunContext,
  type Hook,
  type Tool as RuntimeTool,
} from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { AddMessageCommand } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message.command';
import { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateUserMessageCommand } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.command';
import { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { MapMessagesToInferenceCommand } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.command';
import { ResolveModelProviderUseCase } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import { ResolveModelProviderQuery } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.query';
import {
  RunUserInput,
  RunToolResultInput,
} from '../../../domain/run-input.entity';
import type { RunInput } from '../../../domain/run-input.entity';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from '../../../domain/run-pii-masks-update.entity';
import {
  RunAnonymizationUnavailableError,
  RunExecutionFailedError,
  RunInvalidInputError,
  RunMaxIterationsReachedError,
  RunNoModelFoundError,
  UnexpectedRunError,
} from '../../runs.errors';
import { RunExecutedEvent } from '../../events/run-executed.event';
import { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
import { ToolAssemblyService } from '../../services/tool-assembly.service';
import { MessageCleanupService } from '../../services/message-cleanup.service';
import { ToolResultCollectorService } from '../../services/tool-result-collector.service';
import { BackendToolAdapter } from '../../agent-runtime/backend-tool.adapter';
import { PersistenceHookFactory } from '../../agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from '../../agent-runtime/hooks/usage-hook.factory';
import { ToolUsageHookFactory } from '../../agent-runtime/hooks/tool-usage-hook.factory';
import { adaptRunEventsToStream } from '../../agent-runtime/run-event-stream.adapter';
import { RuntimeToolIntegrationRegistry } from '../../agent-runtime/runtime-tool-integration.registry';
import type { ExecuteRunCommand } from '../execute-run/execute-run.command';

const RUNTIME_MAX_ITERATIONS = 20;

interface PreparedRuntimeTools {
  tools: RuntimeTool[];
  backendTools: BackendTool[];
  toolIntegrations: RuntimeToolIntegrationRegistry;
}

interface PreparedRuntimeRun extends PreparedRuntimeTools {
  thread: Thread;
  model: LanguageModel;
  orgId: UUID;
  userId: UUID;
  isAnonymous: boolean;
  instructions: string;
}

interface SeededInput {
  message: Message;
  masks: ThreadPiiMask[] | null;
}

interface PreparedToolResultInput {
  input: RunToolResultInput;
  masks: ThreadPiiMask[] | null;
}

/**
 * Runs a thread through the extracted `@ayunis/agent-runtime` loop instead of
 * the legacy in-module loop. Gated behind the `agentRuntimeEnabled` toggle in
 * `ExecuteRunUseCase`. Covers plain chat, tool loops (executable, hybrid and
 * display-only tools) and anonymized threads (user input + PII tool output).
 * Skill activation is a later slice, so that path fails fast.
 */
@Injectable()
export class ExecuteRunViaRuntimeUseCase {
  private readonly logger = new Logger(ExecuteRunViaRuntimeUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly toolAssemblyService: ToolAssemblyService,
    private readonly backendToolAdapter: BackendToolAdapter,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly mapMessagesToInferenceUseCase: MapMessagesToInferenceUseCase,
    private readonly resolveModelProviderUseCase: ResolveModelProviderUseCase,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly persistenceHookFactory: PersistenceHookFactory,
    private readonly usageHookFactory: UsageHookFactory,
    private readonly eventEmitter: EventEmitter2,
    private readonly toolResultCollectorService: ToolResultCollectorService,
    private readonly toolUsageHookFactory: ToolUsageHookFactory,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, void, void>> {
    this.logger.log('executeRunViaRuntime', { threadId: command.threadId });
    const prepared = await this.prepareRun(command);
    this.requireSupported(command.input);
    return this.streamRun(prepared, command.input);
  }

  private async prepareRun(
    command: ExecuteRunCommand,
  ): Promise<PreparedRuntimeRun> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedAccessError();
    }
    this.emitRunExecuted(userId, orgId);

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    const permittedModel = thread.model;
    if (!permittedModel) {
      throw new RunNoModelFoundError({ threadId: thread.id });
    }
    await this.inferenceUsageGuard.preflight(
      { userId, orgId },
      permittedModel.model,
    );

    const isAnonymous = thread.isAnonymous || permittedModel.anonymousOnly;
    const { tools, instructions } =
      await this.toolAssemblyService.buildRunContext(
        thread,
        [],
        permittedModel.model.canUseTools,
        isAnonymous,
      );
    // Skill activation is a later slice; drop the signal tool for now.
    const activateSkill = ToolType.ACTIVATE_SKILL as string;
    const runtimeTools = this.backendToolAdapter.toRuntimeTools(
      tools.filter((tool) => tool.name !== activateSkill),
    );

    return {
      thread,
      model: permittedModel.model,
      orgId,
      userId,
      isAnonymous,
      instructions,
      ...this.prepareTools(tools, runtimeTools),
    };
  }

  private prepareTools(
    backendTools: BackendTool[],
    runtimeTools: RuntimeTool[],
  ): PreparedRuntimeTools {
    return {
      tools: runtimeTools,
      backendTools,
      toolIntegrations: new RuntimeToolIntegrationRegistry(backendTools),
    };
  }

  /** Fails fast on inputs this slice does not yet route through the runtime. */
  private requireSupported(input: RunInput): void {
    if (input instanceof RunUserInput && input.skillId) {
      throw new RunInvalidInputError(
        'The agent runtime path does not yet support skill activation',
      );
    }
  }

  private async *streamRun(
    prepared: PreparedRuntimeRun,
    input: RunInput,
  ): AsyncGenerator<RunStreamItem, void, void> {
    let cleanupRequired = true;
    try {
      const seeded = await this.seedInput(prepared, input);
      // Masks first, so the client can resolve {{pii:…}} tokens in the message.
      if (seeded.masks) {
        yield new RunPiiMasksUpdate(seeded.masks);
      }
      yield seeded.message;
      yield* adaptRunEventsToStream(
        await this.startRun(prepared),
        prepared.thread.id,
        prepared.toolIntegrations,
      );
      cleanupRequired = false;
    } catch (error) {
      if (error instanceof RunMaxIterationsReachedError) {
        cleanupRequired = false;
      }
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Runtime run failed', { error: error as Error });
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error as Error },
      );
    } finally {
      if (cleanupRequired) {
        await this.messageCleanupService.cleanupTrailingNonAssistantMessages(
          prepared.thread.id,
        );
      }
    }
  }

  private async seedInput(
    prepared: PreparedRuntimeRun,
    input: RunInput,
  ): Promise<SeededInput> {
    if (input instanceof RunUserInput) {
      return this.persistUserMessage(prepared, input);
    }
    if (input instanceof RunToolResultInput) {
      return this.persistToolResultSeed(prepared, input);
    }
    throw new RunInvalidInputError('Invalid run input');
  }

  private async startRun(prepared: PreparedRuntimeRun) {
    const messages = await this.mapMessagesToInferenceUseCase.execute(
      new MapMessagesToInferenceCommand(
        prepared.thread.messages,
        prepared.orgId,
      ),
    );
    const provider = await this.resolveModelProviderUseCase.execute(
      new ResolveModelProviderQuery(prepared.model),
    );
    const context = RunContext.create({
      orgId: prepared.orgId,
      userId: prepared.userId,
      threadId: prepared.thread.id,
      isAnonymous: prepared.isAnonymous,
    });
    return run({
      instructions: prepared.instructions,
      model: provider,
      messages,
      tools: prepared.tools,
      ...(prepared.tools.length > 0 ? { toolChoice: 'auto' as const } : {}),
      hooks: this.buildHooks(prepared),
      context,
      maxIterations: RUNTIME_MAX_ITERATIONS,
    });
  }

  private buildHooks(prepared: PreparedRuntimeRun): Hook[] {
    return [
      this.usageHookFactory.create({ model: prepared.model }),
      this.persistenceHookFactory.create({
        thread: prepared.thread,
        integrations: prepared.toolIntegrations,
      }),
      this.toolUsageHookFactory.create({
        userId: prepared.userId,
        orgId: prepared.orgId,
      }),
    ];
  }

  private async persistUserMessage(
    prepared: PreparedRuntimeRun,
    input: RunUserInput,
  ): Promise<SeededInput> {
    const hasText = !!input.text && input.text.trim().length > 0;
    const hasImages = input.pendingImages.length > 0;
    if (!hasText && !hasImages) {
      throw new RunInvalidInputError(
        'Message must contain non-empty text or at least one image',
      );
    }
    if (hasImages && !prepared.model.canVision) {
      throw new RunInvalidInputError(
        'The selected model does not support image inputs',
      );
    }
    let text = input.text;
    let masks: ThreadPiiMask[] | null = null;
    if (hasText && prepared.isAnonymous) {
      const anonymized = await this.anonymizeUserText(prepared, input.text);
      text = anonymized.anonymizedText;
      masks = anonymized.masks;
    }
    const message = await this.createUserMessageUseCase.execute(
      new CreateUserMessageCommand(
        prepared.thread.id,
        text,
        input.pendingImages,
      ),
    );
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(prepared.thread, message),
    );
    return { message, masks };
  }

  private async anonymizeUserText(
    prepared: PreparedRuntimeRun,
    text: string,
  ): Promise<{ anonymizedText: string; masks: ThreadPiiMask[] }> {
    try {
      const result = await this.anonymizeTextForThreadUseCase.execute(
        new AnonymizeTextForThreadCommand(
          text,
          prepared.orgId,
          prepared.thread.id,
        ),
      );
      return { anonymizedText: result.anonymizedText, masks: result.masks };
    } catch (error) {
      throw new RunAnonymizationUnavailableError({
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Collects every pending tool call through the legacy collector so mixed
   * display/backend batches keep the same execution and grouping semantics.
   */
  private async persistToolResultSeed(
    prepared: PreparedRuntimeRun,
    input: RunToolResultInput,
  ): Promise<SeededInput> {
    const safeInput = await this.prepareToolResultInput(prepared, input);
    const { contents, piiMasks } =
      await this.toolResultCollectorService.collectToolResults({
        thread: prepared.thread,
        tools: prepared.backendTools,
        input: safeInput.input,
        orgId: prepared.orgId,
        isAnonymous: prepared.isAnonymous,
      });
    if (contents.length === 0) {
      throw new RunInvalidInputError(
        'No pending tool call to attach this result to',
      );
    }
    const message = await this.createToolResultMessageUseCase.execute(
      new CreateToolResultMessageCommand(prepared.thread.id, contents),
    );
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(prepared.thread, message),
    );
    return { message, masks: piiMasks ?? safeInput.masks };
  }

  private async prepareToolResultInput(
    prepared: PreparedRuntimeRun,
    input: RunToolResultInput,
  ): Promise<PreparedToolResultInput> {
    const pending = prepared.thread
      .getLastMessage()
      ?.content.find(
        (content): content is ToolUseMessageContent =>
          content instanceof ToolUseMessageContent &&
          content.id === input.toolId,
      );
    if (!pending) {
      throw new RunInvalidInputError(
        'No pending tool call to attach this result to',
      );
    }
    if (!prepared.isAnonymous) {
      return {
        input: new RunToolResultInput(pending.id, pending.name, input.result),
        masks: null,
      };
    }
    const anonymized = await this.anonymizeUserText(prepared, input.result);
    return {
      input: new RunToolResultInput(
        pending.id,
        pending.name,
        anonymized.anonymizedText,
      ),
      masks: anonymized.masks,
    };
  }

  private emitRunExecuted(userId: UUID, orgId: UUID): void {
    this.eventEmitter
      .emitAsync(
        RunExecutedEvent.EVENT_NAME,
        new RunExecutedEvent(userId, orgId),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit RunExecutedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });
  }
}
