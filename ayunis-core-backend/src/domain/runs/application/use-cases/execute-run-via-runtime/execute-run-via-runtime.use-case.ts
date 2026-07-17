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
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
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
import { TrimMessagesForContextUseCase } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.use-case';
import { TrimMessagesForContextCommand } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.command';
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
  RunNoModelFoundError,
} from '../../runs.errors';
import { RunExecutedEvent } from '../../events/run-executed.event';
import { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
import { ToolAssemblyService } from '../../services/tool-assembly.service';
import { MessageCleanupService } from '../../services/message-cleanup.service';
import { BackendToolAdapter } from '../../agent-runtime/backend-tool.adapter';
import { PersistenceHookFactory } from '../../agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from '../../agent-runtime/hooks/usage-hook.factory';
import { SkillActivationHookFactory } from '../../agent-runtime/hooks/skill-activation-hook.factory';
import { adaptRunEventsToStream } from '../../agent-runtime/run-event-stream.adapter';
import type { ExecuteRunCommand } from '../execute-run/execute-run.command';

const RUNTIME_MAX_ITERATIONS = 20;
const MAX_CONTEXT_TOKENS = 80000;
const DISPLAY_ACK = 'Tool has been displayed successfully';

interface PreparedRuntimeRun {
  thread: Thread;
  model: LanguageModel;
  orgId: UUID;
  userId: UUID;
  isAnonymous: boolean;
  instructions: string;
  tools: RuntimeTool[];
  activeSkills: Skill[];
  canUseTools: boolean;
  skillInstructions?: string;
}

interface SeededInput {
  message: Message;
  masks: ThreadPiiMask[] | null;
}

/**
 * Runs a thread through the extracted `@ayunis/agent-runtime` loop instead of
 * the legacy in-module loop. Gated behind the `agentRuntimeEnabled` toggle in
 * `ExecuteRunUseCase`. Covers plain chat, tool loops (executable, hybrid and
 * display-only tools), anonymized threads (user input + PII tool output) and
 * skill activation (quick-action skillId + mid-loop `activate_skill`).
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
    private readonly skillActivationService: SkillActivationService,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly mapMessagesToInferenceUseCase: MapMessagesToInferenceUseCase,
    private readonly trimMessagesForContextUseCase: TrimMessagesForContextUseCase,
    private readonly resolveModelProviderUseCase: ResolveModelProviderUseCase,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly persistenceHookFactory: PersistenceHookFactory,
    private readonly usageHookFactory: UsageHookFactory,
    private readonly skillActivationHookFactory: SkillActivationHookFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, void, void>> {
    this.logger.log('executeRunViaRuntime', { threadId: command.threadId });
    const prepared = await this.prepareRun(command);
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

    const found = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    const permittedModel = found.thread.model;
    if (!permittedModel) {
      throw new RunNoModelFoundError({ threadId: found.thread.id });
    }
    await this.inferenceUsageGuard.preflight(
      { userId, orgId },
      permittedModel.model,
    );

    const isAnonymous =
      found.thread.isAnonymous || permittedModel.anonymousOnly;
    const activeSkills = await this.toolAssemblyService.findActiveSkills();
    const canUseTools = permittedModel.model.canUseTools;
    const activated = await this.activateSkillIfRequested(
      command,
      found.thread,
    );
    const { tools, instructions } =
      await this.toolAssemblyService.buildRunContext(
        activated.thread,
        activeSkills,
        canUseTools,
        isAnonymous,
      );

    return {
      thread: activated.thread,
      model: permittedModel.model,
      orgId,
      userId,
      isAnonymous,
      instructions,
      tools: this.backendToolAdapter.toRuntimeTools(tools),
      activeSkills,
      canUseTools,
      skillInstructions: activated.skillInstructions,
    };
  }

  /**
   * Activates the requested skill on the thread before tool assembly, so the
   * skill's sources, integrations and knowledge bases are reflected in the
   * assembled tools. Returns the refreshed thread and the skill's instructions
   * (folded into the user message, as the legacy loop does).
   */
  private async activateSkillIfRequested(
    command: ExecuteRunCommand,
    thread: Thread,
  ): Promise<{ thread: Thread; skillInstructions?: string }> {
    const input = command.input;
    if (!(input instanceof RunUserInput) || !input.skillId) {
      return { thread };
    }
    const activation = await this.skillActivationService.activateOnThread(
      input.skillId,
      thread,
    );
    const refreshed = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    return {
      thread: refreshed.thread,
      skillInstructions: activation.instructions,
    };
  }

  private async *streamRun(
    prepared: PreparedRuntimeRun,
    input: RunInput,
  ): AsyncGenerator<RunStreamItem, void, void> {
    let succeeded = false;
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
      );
      succeeded = true;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Runtime run failed', { error: error as Error });
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error as Error },
      );
    } finally {
      if (!succeeded) {
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
      const message = await this.persistToolResultSeed(prepared, input);
      return { message, masks: null };
    }
    throw new RunInvalidInputError('Invalid run input');
  }

  private async startRun(prepared: PreparedRuntimeRun) {
    const trimmed = this.trimMessagesForContextUseCase.execute(
      new TrimMessagesForContextCommand(
        prepared.thread.messages,
        MAX_CONTEXT_TOKENS,
      ),
    );
    const messages = await this.mapMessagesToInferenceUseCase.execute(
      new MapMessagesToInferenceCommand(trimmed, prepared.orgId),
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
      this.persistenceHookFactory.create({ threadId: prepared.thread.id }),
      this.usageHookFactory.create({ model: prepared.model }),
      this.skillActivationHookFactory.create({
        threadId: prepared.thread.id,
        activeSkills: prepared.activeSkills,
        canUseTools: prepared.canUseTools,
        isAnonymous: prepared.isAnonymous,
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
        prepared.skillInstructions,
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
   * Seeds the client-supplied result for a display-only tool call so the
   * runtime can continue the conversation. Mirrors the legacy display-tool
   * handling: the matching call gets the client result, sibling display calls
   * get an acknowledgement.
   */
  private async persistToolResultSeed(
    prepared: PreparedRuntimeRun,
    input: RunToolResultInput,
  ): Promise<Message> {
    const lastMessage = prepared.thread.getLastMessage();
    const items: MessageContent[] = lastMessage?.content ?? [];
    const toolUses = items.filter(
      (content): content is ToolUseMessageContent =>
        content instanceof ToolUseMessageContent,
    );
    const contents = toolUses.map((content) =>
      content.id === input.toolId
        ? new ToolResultMessageContent(
            input.toolId,
            input.toolName,
            input.result,
          )
        : new ToolResultMessageContent(content.id, content.name, DISPLAY_ACK),
    );
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
    return message;
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
