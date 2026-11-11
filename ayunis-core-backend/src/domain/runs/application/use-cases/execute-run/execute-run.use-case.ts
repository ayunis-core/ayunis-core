import type { UUID } from 'crypto';
import type {
  PreparedRun,
  PreparedTools,
} from 'src/domain/runs/application/services/run-assembly.types';
import { Injectable, Logger } from '@nestjs/common';
import { AnonymizationInputTooLongError } from 'src/common/anonymization/application/anonymization.errors';
import { ProviderUnavailableError } from 'src/common/errors/provider.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ThreadPiiMaskThreadMissingError } from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { AddMessageCommand } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message.command';
import { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateUserMessageCommand } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.command';
import { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import {
  RunNudgeInput,
  RunUserInput,
  RunToolContinuationInput,
  RunToolDecisionsInput,
  RunToolResultInput,
  type RunInput,
} from 'src/domain/runs/domain/run-input.entity';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';
import {
  RunAnonymizationUnavailableError,
  RunInvalidInputError,
  RunNoModelFoundError,
  UnexpectedRunError,
} from 'src/domain/runs/application/runs.errors';
import { InferenceAdmissionGuard } from 'src/iam/quotas/application/services/inference-admission-guard.service';
import { MessageCleanupService } from 'src/domain/runs/application/services/message-cleanup.service';
import { ThreadRunLock } from 'src/domain/runs/application/services/thread-run-lock.service';
import { RunTelemetryService } from 'src/domain/runs/application/services/run-telemetry.service';
import { ToolResultCollectorService } from 'src/domain/runs/application/services/tool-result-collector.service';
import {
  ToolCallConfirmationService,
  answerWithoutRunning,
} from 'src/domain/runs/application/services/tool-call-confirmation.service';
import type { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { EffectiveRunModelResolverService } from 'src/domain/runs/application/services/effective-run-model-resolver.service';
import { BackendToolAdapter } from 'src/domain/runs/application/agent-runtime/backend-tool.adapter';
import { adaptRunEventsToStream } from 'src/domain/runs/application/agent-runtime/run-event-stream.adapter';
import { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import type { ExecuteRunCommand } from 'src/domain/runs/application/use-cases/execute-run/execute-run.command';
import type {
  OwnMessage,
  PreparedToolResultInput,
  SeededInput,
} from './execute-run.types';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { shouldPreserveTranscript } from './rejected-transcript-policy';
import { toRunError } from './to-run-error';
import { openThreadRun } from './open-thread-run';
import { findPendingToolCall } from './pending-tool-call.helper';
import { RunAssemblyService } from 'src/domain/runs/application/services/run-assembly.service';
import { RunProfileRegistry } from 'src/domain/runs/application/run-profiles/run-profile.registry';
import { RunProfileAssembler } from 'src/domain/runs/application/run-profiles/run-profile-assembler.service';

@Injectable()
export class ExecuteRunUseCase {
  private readonly runEventStreamLogger = new Logger('RunEventStreamAdapter');
  private readonly logger = new Logger(ExecuteRunUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly effectiveRunModelResolver: EffectiveRunModelResolverService,
    private readonly inferenceAdmissionGuard: InferenceAdmissionGuard,
    private readonly backendToolAdapter: BackendToolAdapter,
    private readonly skillActivationService: SkillActivationService,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly runTelemetryService: RunTelemetryService,
    private readonly toolResultCollectorService: ToolResultCollectorService,
    private readonly runAssemblyService: RunAssemblyService,
    private readonly runProfileRegistry: RunProfileRegistry,
    private readonly runProfileAssembler: RunProfileAssembler,
    private readonly threadRunLock: ThreadRunLock,
    private readonly toolCallConfirmationService: ToolCallConfirmationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, RunExecutionOutcome | void, void>> {
    this.logger.log({ threadId: command.threadId }, 'executeRun');
    return this.runTelemetryService.track('agent_runtime', () =>
      this.createRunStream(command),
    );
  }

  // Telemetry must observe the classified error, not the raw dependency failure.
  @HandleUnexpectedErrors(UnexpectedRunError)
  private async createRunStream(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, RunExecutionOutcome, void>> {
    // History is read inside the lock: a run still finishing on this thread
    // must not leave half of its turn in the next run's snapshot.
    return openThreadRun(this.threadRunLock, command, async () =>
      this.streamRun(
        await this.prepareRun(command),
        command.input,
        command.signal,
      ),
    );
  }

  private async prepareRun(command: ExecuteRunCommand): Promise<PreparedRun> {
    const { userId, orgId } = getRequiredUserContext(this.contextService);
    this.runTelemetryService.recordAttempt(userId, orgId);

    const found = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    this.toolCallConfirmationService.validateInput(found.thread, command.input);
    const { model, isAnonymous } = await this.admitModel(
      found.thread,
      userId,
      orgId,
    );
    const activated = await this.activateSkillIfRequested(
      command,
      found.thread,
    );
    // Saved before assembly, so the continuing run already allows the tool.
    if (command.input instanceof RunToolDecisionsInput) {
      await this.toolCallConfirmationService.saveAlwaysAllowedTools(
        activated.thread,
        command.input,
      );
    }
    const profile = this.runProfileRegistry.get(command.profile.id);
    const assembled = await this.runProfileAssembler.assemble(profile, {
      profile: command.profile,
      thread: activated.thread,
      model,
      userId,
      orgId,
      isAnonymous,
      activatedSkillName: activated.skillName,
    });
    const preparedTools = this.prepareTools(assembled.tools);

    return {
      thread: activated.thread,
      model,
      orgId,
      userId,
      isAnonymous,
      instructions: assembled.instructions,
      maxIterations: profile.maxIterations,
      ...preparedTools,
      profileHooks: assembled.createHooks(preparedTools.toolIntegrations),
      skillInstructions: activated.skillInstructions,
    };
  }

  private async admitModel(
    thread: Thread,
    userId: UUID,
    orgId: UUID,
  ): Promise<{ model: LanguageModel; isAnonymous: boolean }> {
    const storedPermit = thread.model;
    if (!storedPermit) {
      throw new RunNoModelFoundError({ threadId: thread.id });
    }
    const permittedModel = await this.effectiveRunModelResolver.resolve({
      storedPermit,
      userId,
      orgId,
    });
    await this.inferenceAdmissionGuard.preflight(
      { userId, orgId },
      permittedModel.model,
    );
    return {
      model: permittedModel.model,
      isAnonymous: thread.isAnonymous || permittedModel.anonymousOnly,
    };
  }

  private prepareTools(backendTools: BackendTool[]): PreparedTools {
    return {
      tools: this.backendToolAdapter.toRuntimeTools(backendTools),
      backendTools,
      toolIntegrations: new RuntimeToolIntegrationRegistry(backendTools),
    };
  }

  private async activateSkillIfRequested(
    command: ExecuteRunCommand,
    thread: Thread,
  ): Promise<{
    thread: Thread;
    skillInstructions?: string;
    skillName?: string;
  }> {
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
      skillName: activation.skillName,
    };
  }

  private async *streamRun(
    prepared: PreparedRun,
    input: RunInput,
    signal?: AbortSignal,
  ): AsyncGenerator<RunStreamItem, RunExecutionOutcome, void> {
    let cleanupRequired = true;
    const ownedMessageIds = new Set<UUID>();
    const own: OwnMessage = (messageId) => ownedMessageIds.add(messageId);
    if (signal?.aborted) {
      if (input instanceof RunUserInput) input.releaseImages();
      return 'aborted';
    }
    try {
      const seeded = await this.seedInput(prepared, input, own);
      if (seeded === null) {
        cleanupRequired = false;
        return 'aborted';
      }
      // Removing a settled continuation would make its earlier calls replayable.
      cleanupRequired = !(input instanceof RunToolContinuationInput);
      // Masks first, so the client can resolve {{pii:…}} tokens in the message.
      if (seeded.masks) {
        yield new RunPiiMasksUpdate(seeded.masks);
      }
      yield* seeded.messages;
      const started = await this.runAssemblyService.assemble(
        prepared,
        own,
        signal,
      );
      const outcome = yield* adaptRunEventsToStream(
        started.events,
        prepared.thread.id,
        this.runEventStreamLogger,
        { integrations: prepared.toolIntegrations, models: started.models },
      );
      cleanupRequired = cleanupRequired && outcome === 'aborted';
      return outcome;
    } catch (error) {
      if (shouldPreserveTranscript(error, input)) cleanupRequired = false;
      throw toRunError(error, this.logger);
    } finally {
      if (cleanupRequired) {
        await this.messageCleanupService.cleanupTrailingNonAssistantMessages(
          prepared.thread.id,
          ownedMessageIds,
        );
      }
    }
  }

  private async seedInput(
    prepared: PreparedRun,
    input: RunInput,
    own: OwnMessage,
  ): Promise<SeededInput | null> {
    try {
      return await this.persistInput(prepared, input, own);
    } catch (error) {
      if (error instanceof ThreadPiiMaskThreadMissingError) return null;
      throw error;
    } finally {
      if (input instanceof RunUserInput) input.releaseImages();
    }
  }

  private async persistInput(
    prepared: PreparedRun,
    input: RunInput,
    own: OwnMessage,
  ): Promise<SeededInput | null> {
    if (input instanceof RunUserInput) {
      return this.persistUserMessage(prepared, input, own);
    }
    if (
      input instanceof RunToolResultInput ||
      input instanceof RunToolDecisionsInput
    ) {
      return this.persistToolResultSeed(prepared, input, own);
    }
    throw new RunInvalidInputError('Invalid run input');
  }

  private async persistUserMessage(
    prepared: PreparedRun,
    input: RunUserInput,
    own: OwnMessage,
  ): Promise<SeededInput | null> {
    const hasText = this.validateUserInput(prepared, input);
    let text = input.text;
    let masks: ThreadPiiMask[] | null = null;
    if (hasText && prepared.isAnonymous) {
      const anonymized = await this.anonymizeUserText(prepared, input.text);
      text = anonymized.anonymizedText;
      masks = anonymized.masks;
    }
    // Sending instead of deciding rejects the calls, so every call of the
    // turn has its result before the user message.
    const rejections = await this.rejectCallsAwaitingConfirmation(
      prepared,
      own,
    );
    if (rejections === null) return null;
    const message = await this.createUserMessageUseCase.execute(
      new CreateUserMessageCommand(
        prepared.thread.id,
        text,
        input.pendingImages,
        prepared.skillInstructions,
        input instanceof RunNudgeInput,
      ),
    );
    own(message.id);
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(prepared.thread, message),
    );
    return {
      messages: [...rejections, message],
      masks,
    };
  }

  /** Returns whether the message has text. */
  private validateUserInput(
    prepared: PreparedRun,
    input: RunUserInput,
  ): boolean {
    const hasText = !!input.text && input.text.trim().length > 0;
    const hasImages = input.pendingImages.length > 0;
    const hasSkillInstructions = !!prepared.skillInstructions?.trim();
    if (!hasText && !hasImages && !hasSkillInstructions) {
      throw new RunInvalidInputError(
        'Message must contain non-empty text, at least one image, or skill instructions',
      );
    }
    if (hasImages && !prepared.model.canVision) {
      throw new RunInvalidInputError(
        'The selected model does not support image inputs',
      );
    }
    return hasText;
  }

  /** Null when the thread disappeared. */
  private async rejectCallsAwaitingConfirmation(
    prepared: PreparedRun,
    own: OwnMessage,
  ): Promise<ToolResultMessage[] | null> {
    const contents = answerWithoutRunning(prepared.thread);
    if (contents.length === 0) return [];
    const message = await this.persistToolResults(prepared, contents, own);
    return message && [message];
  }

  private async anonymizeUserText(
    prepared: PreparedRun,
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
      if (
        error instanceof AnonymizationInputTooLongError ||
        error instanceof ProviderUnavailableError ||
        error instanceof ThreadPiiMaskThreadMissingError
      ) {
        throw error;
      }
      throw new RunAnonymizationUnavailableError(
        {
          originalError:
            error instanceof Error ? error.message : 'Unknown error',
        },
        error,
      );
    }
  }

  private async persistToolResultSeed(
    prepared: PreparedRun,
    input: RunToolResultInput | RunToolDecisionsInput,
    own: OwnMessage,
  ): Promise<SeededInput | null> {
    const safeInput =
      input instanceof RunToolResultInput
        ? await this.prepareToolResultInput(prepared, input)
        : { input, masks: null };
    const { contents, piiMasks } =
      await this.toolResultCollectorService.collectToolResults({
        thread: prepared.thread,
        tools: prepared.backendTools,
        input: safeInput.input,
        orgId: prepared.orgId,
        isAnonymous: prepared.isAnonymous,
        executionPath: 'agent_runtime',
      });
    if (contents.length === 0) {
      throw new RunInvalidInputError(
        'No pending tool call to attach this result to',
      );
    }
    const message = await this.persistToolResults(prepared, contents, own);
    if (message === null) return null;
    return { messages: [message], masks: piiMasks ?? safeInput.masks };
  }

  private async persistToolResults(
    prepared: PreparedRun,
    contents: ToolResultMessageContent[],
    own: OwnMessage,
  ): Promise<ToolResultMessage | null> {
    const message = await this.createToolResultMessageUseCase.execute(
      new CreateToolResultMessageCommand(prepared.thread.id, contents),
    );
    if (message === null) return null;
    own(message.id);
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(prepared.thread, message),
    );
    return message;
  }

  private async prepareToolResultInput(
    prepared: PreparedRun,
    input: RunToolResultInput,
  ): Promise<PreparedToolResultInput> {
    const pending = findPendingToolCall(prepared.thread, input.toolId);
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
}
