import { run, RunContext, type Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { AnonymizationInputTooLongError } from 'src/common/anonymization/application/anonymization.errors';
import { ProviderUnavailableError } from 'src/common/errors/provider.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { Tool as BackendTool } from 'src/domain/tools/domain/tool.entity';
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
import { ResolveModelProviderUseCase } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import { ResolveModelProviderQuery } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.query';
import {
  RunUserInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import type { RunInput } from 'src/domain/runs/domain/run-input.entity';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';
import {
  RunAnonymizationUnavailableError,
  RunExecutionFailedError,
  RunInvalidInputError,
  RunMaxIterationsReachedError,
  RunNoModelFoundError,
  RunToolRepeatedlyFailingError,
  UnexpectedRunError,
} from 'src/domain/runs/application/runs.errors';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { ToolAssemblyService } from 'src/domain/runs/application/services/tool-assembly.service';
import { MessageCleanupService } from 'src/domain/runs/application/services/message-cleanup.service';
import { RunTelemetryService } from 'src/domain/runs/application/services/run-telemetry.service';
import { ToolResultCollectorService } from 'src/domain/runs/application/services/tool-result-collector.service';
import { UnmaskedTermsService } from 'src/domain/runs/application/services/unmasked-terms.service';
import { BackendToolAdapter } from 'src/domain/runs/application/agent-runtime/backend-tool.adapter';
import { PersistenceHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/persistence-hook.factory';
import { UsageHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/usage-hook.factory';
import { ToolUsageHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/tool-usage-hook.factory';
import { SkillActivationHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/skill-activation-hook.factory';
import { ContextBudgetHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/context-budget-hook.factory';
import { adaptRunEventsToStream } from 'src/domain/runs/application/agent-runtime/run-event-stream.adapter';
import { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import { RuntimeModelProviderDecorator } from 'src/domain/runs/application/agent-runtime/runtime-model-provider.decorator';
import { RuntimeHistoryMaterializer } from 'src/domain/runs/application/agent-runtime/runtime-history-materializer';
import { appendSkillActivatedNote } from 'src/domain/runs/application/helpers/append-skill-activated-note';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import type { ExecuteRunCommand } from 'src/domain/runs/application/use-cases/execute-run/execute-run.command';
import type {
  PreparedRuntimeRun,
  PreparedRuntimeTools,
} from './execute-run-via-runtime.types';
import { MAX_CONTEXT_TOKENS } from 'src/domain/runs/application/context-budget.constants';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';

const RUNTIME_MAX_ITERATIONS = 50;

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
 * externally handled tools), anonymized threads (user input + PII tool output) and
 * skill activation (quick-action skillId + mid-loop `activate_skill`).
 */
@Injectable()
export class ExecuteRunViaRuntimeUseCase {
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
    private readonly runtimeHistoryMaterializer: RuntimeHistoryMaterializer,
    private readonly resolveModelProviderUseCase: ResolveModelProviderUseCase,
    private readonly runtimeModelProviderDecorator: RuntimeModelProviderDecorator,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly persistenceHookFactory: PersistenceHookFactory,
    private readonly usageHookFactory: UsageHookFactory,
    private readonly skillActivationHookFactory: SkillActivationHookFactory,
    private readonly runTelemetryService: RunTelemetryService,
    private readonly toolResultCollectorService: ToolResultCollectorService,
    private readonly unmaskedTermsService: UnmaskedTermsService,
    private readonly toolUsageHookFactory: ToolUsageHookFactory,
    private readonly contextBudgetHookFactory: ContextBudgetHookFactory,
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
    @InjectPinoLogger(ExecuteRunViaRuntimeUseCase.name)
    private readonly logger: PinoLogger,
    @InjectPinoLogger('RunEventStreamAdapter')
    private readonly runEventStreamLogger: PinoLogger,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, RunExecutionOutcome, void>> {
    this.logger.info({ threadId: command.threadId }, 'executeRunViaRuntime');
    const prepared = await this.prepareRun(command);
    return this.streamRun(prepared, command.input, command.signal);
  }

  private async prepareRun(
    command: ExecuteRunCommand,
  ): Promise<PreparedRuntimeRun> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedAccessError();
    }
    this.runTelemetryService.recordAttempt(userId, orgId);

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
    const anonymous = found.thread.isAnonymous || permittedModel.anonymousOnly;
    const activeSkills = await this.toolAssemblyService.findActiveSkills();
    const workspaceContext = await this.buildWorkspaceContext(found.thread);
    const activated = await this.activateSkillIfRequested(
      command,
      found.thread,
      workspaceContext,
    );
    const { tools, instructions } =
      await this.toolAssemblyService.buildRunContext(
        activated.thread,
        activeSkills,
        permittedModel.model.canUseTools,
        anonymous,
        workspaceContext,
      );

    return {
      thread: activated.thread,
      model: permittedModel.model,
      orgId,
      userId,
      isAnonymous: anonymous,
      instructions: appendSkillActivatedNote(instructions, activated.skillName),
      ...this.prepareTools(tools),
      activeSkills,
      canUseTools: permittedModel.model.canUseTools,
      skillInstructions: activated.skillInstructions,
      activatedSkillName: activated.skillName,
    };
  }

  private buildWorkspaceContext(thread: Thread) {
    if (!thread.workspaceId) return Promise.resolve(undefined);
    return this.buildWorkspaceRunContextUseCase.execute(
      new BuildWorkspaceRunContextQuery(thread.workspaceId),
    );
  }

  private prepareTools(backendTools: BackendTool[]): PreparedRuntimeTools {
    return {
      tools: this.backendToolAdapter.toRuntimeTools(backendTools),
      backendTools,
      toolIntegrations: new RuntimeToolIntegrationRegistry(backendTools),
    };
  }

  private async activateSkillIfRequested(
    command: ExecuteRunCommand,
    thread: Thread,
    workspaceContext?: WorkspaceRunContext,
  ): Promise<{
    thread: Thread;
    skillInstructions?: string;
    skillName?: string;
  }> {
    const input = command.input;
    if (!(input instanceof RunUserInput) || !input.skillId) {
      return { thread };
    }
    if (workspaceContext?.skills.some((skill) => skill.id === input.skillId)) {
      throw new RunInvalidInputError(
        'Project skills are already active in this workspace',
      );
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
    prepared: PreparedRuntimeRun,
    input: RunInput,
    signal?: AbortSignal,
  ): AsyncGenerator<RunStreamItem, RunExecutionOutcome, void> {
    let cleanupRequired = true;
    try {
      const seeded = await this.seedInput(prepared, input);
      if (seeded === null) {
        cleanupRequired = false;
        return 'aborted';
      }
      // Masks first, so the client can resolve {{pii:…}} tokens in the message.
      if (seeded.masks) {
        yield new RunPiiMasksUpdate(seeded.masks);
      }
      yield seeded.message;
      const outcome = yield* adaptRunEventsToStream(
        await this.startRun(prepared, signal),
        prepared.thread.id,
        this.runEventStreamLogger,
        prepared.toolIntegrations,
      );
      cleanupRequired = outcome === 'aborted';
      return outcome;
    } catch (error) {
      // Both errors leave a complete, already-streamed tool transcript;
      // rolling it back would re-arm the turn's pending tool calls.
      if (
        error instanceof RunMaxIterationsReachedError ||
        error instanceof RunToolRepeatedlyFailingError
      ) {
        cleanupRequired = false;
      }
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Runtime run failed');
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
  ): Promise<SeededInput | null> {
    if (input instanceof RunUserInput) {
      return this.persistUserMessage(prepared, input);
    }
    if (input instanceof RunToolResultInput) {
      return this.persistToolResultSeed(prepared, input);
    }
    throw new RunInvalidInputError('Invalid run input');
  }

  private async startRun(prepared: PreparedRuntimeRun, signal?: AbortSignal) {
    const historyMessages = await this.unmaskedTermsService.revealUnmaskedTerms(
      prepared.thread.messages,
      prepared.thread.id,
      prepared.isAnonymous,
    );
    const messages = await this.runtimeHistoryMaterializer.materialize({
      messages: historyMessages,
      orgId: prepared.orgId,
      tools: prepared.backendTools,
      maxTokens: MAX_CONTEXT_TOKENS,
    });
    const provider = await this.resolveModelProviderUseCase.execute(
      new ResolveModelProviderQuery(prepared.model),
    );
    const guardedProvider = this.runtimeModelProviderDecorator.decorate(
      provider,
      {
        userId: prepared.userId,
        orgId: prepared.orgId,
        model: prepared.model,
        toolIntegrations: prepared.toolIntegrations,
      },
    );
    const context = RunContext.create({
      orgId: prepared.orgId,
      userId: prepared.userId,
      threadId: prepared.thread.id,
      isAnonymous: prepared.isAnonymous,
    });
    return run({
      instructions: prepared.instructions,
      model: guardedProvider,
      messages,
      tools: prepared.tools,
      ...(prepared.tools.length > 0 ? { toolChoice: 'auto' as const } : {}),
      hooks: this.buildHooks(prepared),
      context,
      maxIterations: RUNTIME_MAX_ITERATIONS,
      ...(signal ? { signal } : {}),
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
        integrations: prepared.toolIntegrations,
      }),
      this.skillActivationHookFactory.create({
        threadId: prepared.thread.id,
        activeSkills: prepared.activeSkills,
        canUseTools: prepared.canUseTools,
        isAnonymous: prepared.isAnonymous,
        integrations: prepared.toolIntegrations,
        activatedSkillName: prepared.activatedSkillName,
      }),
      this.contextBudgetHookFactory.create({
        maxTokens: MAX_CONTEXT_TOKENS,
      }),
    ];
  }

  private async persistUserMessage(
    prepared: PreparedRuntimeRun,
    input: RunUserInput,
  ): Promise<SeededInput> {
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
      if (
        error instanceof AnonymizationInputTooLongError ||
        error instanceof ProviderUnavailableError
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

  /**
   * Collects every pending tool call through the legacy collector so mixed
   * display/backend batches keep the same execution and grouping semantics.
   */
  private async persistToolResultSeed(
    prepared: PreparedRuntimeRun,
    input: RunToolResultInput,
  ): Promise<SeededInput | null> {
    const safeInput = await this.prepareToolResultInput(prepared, input);
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
    const message = await this.createToolResultMessageUseCase.execute(
      new CreateToolResultMessageCommand(prepared.thread.id, contents),
    );
    if (message === null) return null;
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
}
