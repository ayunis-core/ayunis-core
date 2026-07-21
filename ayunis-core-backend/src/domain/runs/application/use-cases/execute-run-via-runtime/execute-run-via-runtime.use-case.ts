import { run, RunContext, type Hook } from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { AddMessageCommand } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message.command';
import { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateUserMessageCommand } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.command';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { MapMessagesToInferenceCommand } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.command';
import { TrimMessagesForContextUseCase } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.use-case';
import { TrimMessagesForContextCommand } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.command';
import { ResolveModelProviderUseCase } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import { ResolveModelProviderQuery } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.query';
import { RunUserInput } from '../../../domain/run-input.entity';
import type { RunStreamItem } from '../../../domain/run-pii-masks-update.entity';
import {
  RunExecutionFailedError,
  RunInvalidInputError,
  RunNoModelFoundError,
} from '../../runs.errors';
import { RunExecutedEvent } from '../../events/run-executed.event';
import { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
import { ToolAssemblyService } from '../../services/tool-assembly.service';
import { MessageCleanupService } from '../../services/message-cleanup.service';
import { PersistenceHookFactory } from '../../agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from '../../agent-runtime/hooks/usage-hook.factory';
import { adaptRunEventsToStream } from '../../agent-runtime/run-event-stream.adapter';
import type { ExecuteRunCommand } from '../execute-run/execute-run.command';

const RUNTIME_MAX_ITERATIONS = 20;
const MAX_CONTEXT_TOKENS = 80000;

interface PreparedRuntimeRun {
  thread: Thread;
  model: LanguageModel;
  orgId: UUID;
  userId: UUID;
  isAnonymous: boolean;
  instructions: string;
}

/**
 * Runs a thread through the extracted `@ayunis/agent-runtime` loop instead of
 * the legacy in-module loop. Gated behind the `agentRuntimeEnabled` toggle in
 * `ExecuteRunUseCase`. This slice covers plain chat only; tool loops,
 * anonymization and skills are added in later slices, so the unsupported paths
 * fail fast rather than silently degrading.
 */
@Injectable()
export class ExecuteRunViaRuntimeUseCase {
  private readonly logger = new Logger(ExecuteRunViaRuntimeUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly toolAssemblyService: ToolAssemblyService,
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly mapMessagesToInferenceUseCase: MapMessagesToInferenceUseCase,
    private readonly trimMessagesForContextUseCase: TrimMessagesForContextUseCase,
    private readonly resolveModelProviderUseCase: ResolveModelProviderUseCase,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly persistenceHookFactory: PersistenceHookFactory,
    private readonly usageHookFactory: UsageHookFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, void, void>> {
    this.logger.log('executeRunViaRuntime', { threadId: command.threadId });
    const prepared = await this.prepareRun(command);
    const input = this.requireSupportedInput(command, prepared);
    return this.streamRun(prepared, input);
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
    const { instructions } = await this.toolAssemblyService.buildRunContext(
      thread,
      [],
      false,
      isAnonymous,
    );

    return {
      thread,
      model: permittedModel.model,
      orgId,
      userId,
      isAnonymous,
      instructions,
    };
  }

  /** Fails fast on inputs this slice does not yet route through the runtime. */
  private requireSupportedInput(
    command: ExecuteRunCommand,
    prepared: PreparedRuntimeRun,
  ): RunUserInput {
    if (!(command.input instanceof RunUserInput)) {
      throw new RunInvalidInputError(
        'The agent runtime path does not yet support tool-result inputs',
      );
    }
    if (prepared.isAnonymous) {
      throw new RunInvalidInputError(
        'The agent runtime path does not yet support anonymous threads',
      );
    }
    if (command.input.skillId) {
      throw new RunInvalidInputError(
        'The agent runtime path does not yet support skill activation',
      );
    }
    return command.input;
  }

  private async *streamRun(
    prepared: PreparedRuntimeRun,
    input: RunUserInput,
  ): AsyncGenerator<RunStreamItem, void, void> {
    let succeeded = false;
    try {
      const userMessage = await this.persistUserMessage(prepared, input);
      yield userMessage;
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

  private async startRun(prepared: PreparedRuntimeRun) {
    const trimmedMessages = this.trimMessagesForContextUseCase.execute(
      new TrimMessagesForContextCommand(
        prepared.thread.messages,
        MAX_CONTEXT_TOKENS,
      ),
    );
    const messages = await this.mapMessagesToInferenceUseCase.execute(
      new MapMessagesToInferenceCommand(trimmedMessages, prepared.orgId),
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
      hooks: this.buildHooks(prepared),
      context,
      maxIterations: RUNTIME_MAX_ITERATIONS,
    });
  }

  private buildHooks(prepared: PreparedRuntimeRun): Hook[] {
    return [
      this.persistenceHookFactory.create({ threadId: prepared.thread.id }),
      this.usageHookFactory.create({ model: prepared.model }),
    ];
  }

  private async persistUserMessage(
    prepared: PreparedRuntimeRun,
    input: RunUserInput,
  ): Promise<UserMessage> {
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
    const message = await this.createUserMessageUseCase.execute(
      new CreateUserMessageCommand(
        prepared.thread.id,
        input.text,
        input.pendingImages,
      ),
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
