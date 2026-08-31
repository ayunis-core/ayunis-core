import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Message } from 'src/domain/messages/domain/message.entity';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { AddMessageCommand } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message.command';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateUserMessageCommand } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.command';
import { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import { ToolFailureBreaker } from '@ayunis/agent-runtime';
import type { ToolResultOutcome } from 'src/domain/runs/application/services/tool-result-collector.service';
import {
  RunAnonymizationUnavailableError,
  RunExecutionFailedError,
  RunInvalidInputError,
  RunMaxIterationsReachedError,
  RunNoModelFoundError,
  RunToolRepeatedlyFailingError,
  UnexpectedRunError,
} from 'src/domain/runs/application/runs.errors';
import {
  RunUserInput,
  RunToolResultInput,
} from 'src/domain/runs/domain/run-input.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { AnonymizationInputTooLongError } from 'src/common/anonymization/application/anonymization.errors';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { ExecuteRunCommand } from 'src/domain/runs/application/use-cases/execute-run/execute-run.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { UUID } from 'crypto';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { AnonymizeTextForThreadCommand } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.command';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import {
  RunPiiMasksUpdate,
  RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import { ToolAssemblyService } from 'src/domain/runs/application/services/tool-assembly.service';
import { ToolResultCollectorService } from 'src/domain/runs/application/services/tool-result-collector.service';
import { MessageCleanupService } from 'src/domain/runs/application/services/message-cleanup.service';
import { InferenceOrchestratorService } from 'src/domain/runs/application/services/inference-orchestrator.service';
import type { RunParams } from './run-params.interface';
import { ConfigService } from '@nestjs/config';
import { ExecuteRunViaRuntimeUseCase } from 'src/domain/runs/application/use-cases/execute-run-via-runtime/execute-run-via-runtime.use-case';
import { appendSkillActivatedNote } from 'src/domain/runs/application/helpers/append-skill-activated-note';
import type { RunExecutionOutcome } from 'src/domain/runs/application/run-execution-outcome';
import { RunTelemetryService } from 'src/domain/runs/application/services/run-telemetry.service';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { parseRunInput } from 'src/domain/runs/application/helpers/parse-run-input';
import { EffectiveRunModelResolverService } from 'src/domain/runs/application/services/effective-run-model-resolver.service';

@Injectable()
export class ExecuteRunUseCase {
  // eslint-disable-next-line max-params
  constructor(
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly contextService: ContextService,
    private readonly effectiveRunModelResolver: EffectiveRunModelResolverService,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly toolAssemblyService: ToolAssemblyService,
    private readonly toolResultCollectorService: ToolResultCollectorService,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly inferenceOrchestratorService: InferenceOrchestratorService,
    private readonly skillActivationService: SkillActivationService,
    private readonly configService: ConfigService,
    private readonly executeRunViaRuntimeUseCase: ExecuteRunViaRuntimeUseCase,
    private readonly runTelemetryService: RunTelemetryService,
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
    @InjectPinoLogger(ExecuteRunUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, RunExecutionOutcome | void, void>> {
    this.logger.info(
      {
        threadId: command.threadId,
        streaming: command.streaming,
        inputType: command.input.constructor.name,
      },
      'executeRun',
    );
    const useAgentRuntime = this.configService.get<boolean>(
      'features.agentRuntimeEnabled',
    );
    const executionPath = useAgentRuntime ? 'agent_runtime' : 'legacy';
    return this.runTelemetryService.track(executionPath, () =>
      useAgentRuntime
        ? this.executeRunViaRuntimeUseCase.execute(command)
        : this.executeLegacy(command),
    );
  }

  private async executeLegacy(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, RunExecutionOutcome, void>> {
    try {
      const prepared = await this.prepareRun(command);
      return this.orchestrateRun({
        thread: prepared.thread,
        tools: prepared.tools,
        model: prepared.model.model,
        input: command.input as RunUserInput | RunToolResultInput,
        instructions: prepared.instructions,
        streaming: command.streaming,
        orgId: prepared.orgId,
        isAnonymous: prepared.isAnonymous,
        activeSkills: prepared.activeSkills,
        workspaceContext: prepared.workspaceContext,
        skillId:
          command.input instanceof RunUserInput
            ? command.input.skillId
            : undefined,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new RunExecutionFailedError('Unknown error in execute run', {
        error: error as Error,
      });
    }
  }

  private async prepareRun(command: ExecuteRunCommand): Promise<{
    userId: UUID;
    orgId: UUID;
    thread: Thread;
    model: PermittedLanguageModel;
    isAnonymous: boolean;
    tools: RunParams['tools'];
    instructions?: string;
    activeSkills: RunParams['activeSkills'];
    workspaceContext?: WorkspaceRunContext;
  }> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedException('User not authenticated');
    }
    this.runTelemetryService.recordAttempt(userId, orgId);
    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    const storedPermit = this.pickModel(thread);
    const model = await this.effectiveRunModelResolver.resolve({
      storedPermit,
      userId,
      orgId,
    });
    await this.inferenceUsageGuard.preflight({ userId, orgId }, model.model);
    const isAnonymous = thread.isAnonymous || model.anonymousOnly;
    const workspaceContext = await this.buildWorkspaceContext(thread);
    const activeSkills = await this.toolAssemblyService.findActiveSkills();
    const { tools, instructions } =
      await this.toolAssemblyService.buildRunContext(
        thread,
        activeSkills,
        model.model.canUseTools,
        isAnonymous,
        workspaceContext,
      );
    return {
      userId,
      orgId,
      thread,
      model,
      isAnonymous,
      tools,
      instructions,
      activeSkills,
      workspaceContext,
    };
  }
  private async buildWorkspaceContext(
    thread: Thread,
  ): Promise<WorkspaceRunContext | undefined> {
    if (!thread.workspaceId) return undefined;
    return this.buildWorkspaceRunContextUseCase.execute(
      new BuildWorkspaceRunContextQuery(thread.workspaceId),
    );
  }
  private pickModel(thread: Thread): PermittedLanguageModel {
    if (thread.model) {
      return thread.model;
    }
    throw new RunNoModelFoundError({
      threadId: thread.id,
      userId: thread.userId,
    });
  }
  private async *orchestrateRun(
    params: RunParams,
  ): AsyncGenerator<RunStreamItem, RunExecutionOutcome, void> {
    this.logger.info({ threadId: params.thread.id }, 'orchestrateRun');
    const iterations = 50;
    const breaker = new ToolFailureBreaker();
    let succeeded = false;
    let preserveTranscript = false;
    try {
      for (let i = 0; i < iterations; i++) {
        const assistantMessage = yield* this.runIteration(
          params,
          breaker,
          i === 0,
        );
        if (!assistantMessage) {
          succeeded = true;
          return 'aborted';
        }
        if (this.shouldExitAfterResponse(assistantMessage, params)) {
          const persisted = yield* this.processToolResults(
            params,
            null,
            breaker,
            assistantMessage,
          );
          succeeded = true;
          return persisted ? 'completed' : 'aborted';
        }
      }
      throw new RunMaxIterationsReachedError(iterations);
    } catch (error) {
      preserveTranscript = error instanceof RunToolRepeatedlyFailingError;
      if (error instanceof ApplicationError) throw error;
      this.logger.error({ err: error as Error }, 'Run execution failed');
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error as Error },
      );
    } finally {
      if (!succeeded && !preserveTranscript) {
        await this.messageCleanupService.cleanupTrailingNonAssistantMessages(
          params.thread.id,
        );
      }
    }
  }
  private shouldExitAfterResponse(
    message: AssistantMessage,
    params: RunParams,
  ): boolean {
    return this.toolResultCollectorService.exitLoopAfterAgentResponse(
      message,
      params.tools,
    );
  }
  private async *runIteration(
    params: RunParams,
    breaker: ToolFailureBreaker,
    firstIteration: boolean,
  ): AsyncGenerator<RunStreamItem, AssistantMessage | null, void> {
    const { userInput, toolResultInput } = parseRunInput(params.input);
    if (!firstIteration || toolResultInput) {
      const persisted = yield* this.processToolResults(
        params,
        toolResultInput,
        breaker,
      );
      if (!persisted) return null;
    }
    if (firstIteration) {
      yield* this.handleFirstIteration(params, userInput);
    }
    return yield* this.inferenceOrchestratorService.runInference(params);
  }
  private async *handleFirstIteration(
    params: RunParams,
    userInput: RunUserInput | null,
  ): AsyncGenerator<RunStreamItem, void, void> {
    if (params.skillId) {
      await this.activateSkillOnThread(params);
    }
    if (userInput) {
      const { message, piiMasks } = await this.processUserMessage(
        params,
        userInput,
      );
      // Masks first, so the client can resolve tokens in the message below.
      if (piiMasks) {
        yield new RunPiiMasksUpdate(piiMasks);
      }
      yield message;
    }
  }

  private async *processToolResults(
    params: RunParams,
    toolResultInput: RunToolResultInput | null,
    breaker: ToolFailureBreaker,
    message?: AssistantMessage,
  ): AsyncGenerator<RunStreamItem, boolean, void> {
    const {
      contents: toolResultMessageContent,
      outcomes,
      piiMasks,
    } = await this.toolResultCollectorService.collectToolResults({
      thread: params.thread,
      tools: params.tools,
      input: toolResultInput,
      orgId: params.orgId,
      isAnonymous: params.isAnonymous,
      executionPath: 'legacy',
      message,
    });

    if (toolResultMessageContent.length === 0) return true;

    const toolResultMessage = await this.createToolResultMessageUseCase.execute(
      new CreateToolResultMessageCommand(
        params.thread.id,
        toolResultMessageContent,
      ),
    );
    if (toolResultMessage === null) return false;
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, toolResultMessage),
    );
    // Masks first, so the client can resolve tokens in the message below.
    if (piiMasks) {
      yield new RunPiiMasksUpdate(piiMasks);
    }
    yield toolResultMessage;

    this.assertToolFailuresNotRepeating(breaker, outcomes);

    const skillWasActivated = toolResultMessageContent.some(
      (content) => content.toolName === (ToolType.ACTIVATE_SKILL as string),
    );
    if (skillWasActivated) {
      await this.refreshRunContext(params);
    }
    return true;
  }

  private assertToolFailuresNotRepeating(
    breaker: ToolFailureBreaker,
    outcomes: ToolResultOutcome[],
  ): void {
    const tripped = breaker.record(
      outcomes.map((outcome) => ({
        toolName: outcome.toolName,
        result: outcome.result,
        isError: !outcome.succeeded,
      })),
    );
    if (!tripped) return;
    throw new RunToolRepeatedlyFailingError(
      tripped.toolName,
      tripped.failureCount,
    );
  }

  private async activateSkillOnThread(params: RunParams): Promise<void> {
    if (!params.skillId) return;
    if (
      params.workspaceContext?.skills.some(
        (skill) => skill.id === params.skillId,
      )
    ) {
      throw new RunInvalidInputError(
        'Project skills are already active in this workspace',
      );
    }

    const { instructions, skillName } =
      await this.skillActivationService.activateOnThread(
        params.skillId,
        params.thread,
      );

    params.activatedSkillName = skillName;
    await this.refreshRunContext(params);
    params.skillInstructions = instructions;
  }

  private async refreshRunContext(params: RunParams): Promise<void> {
    const { thread: refreshedThread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(params.thread.id),
    );
    params.thread = refreshedThread;
    params.workspaceContext = await this.buildWorkspaceContext(refreshedThread);
    const refreshed = await this.toolAssemblyService.buildRunContext(
      refreshedThread,
      params.activeSkills,
      params.model.canUseTools,
      params.isAnonymous,
      params.workspaceContext,
    );
    params.tools = refreshed.tools;
    params.instructions = refreshed.instructions;

    if (params.activatedSkillName) {
      params.instructions = appendSkillActivatedNote(
        params.instructions,
        params.activatedSkillName,
      );
    }
  }

  private async processUserMessage(
    params: RunParams,
    userInput: RunUserInput,
  ): Promise<{ message: Message; piiMasks: ThreadPiiMask[] | null }> {
    const hasText = userInput.text && userInput.text.trim().length > 0;
    const hasImages = userInput.pendingImages.length > 0;
    const hasSkillInstructions =
      !!params.skillInstructions && params.skillInstructions.trim().length > 0;

    if (!hasText && !hasImages && !hasSkillInstructions) {
      throw new RunInvalidInputError(
        'Message must contain at least one content item (non-empty text or at least one image)',
      );
    }
    if (hasImages && !params.model.canVision) {
      throw new RunInvalidInputError(
        'The selected model does not support image inputs. Please use a vision-capable model or remove images from your message.',
      );
    }

    let messageText = userInput.text;
    let piiMasks: ThreadPiiMask[] | null = null;
    if (hasText && params.isAnonymous) {
      const anonymized = await this.anonymizeText(
        userInput.text,
        params.orgId,
        params.thread.id,
      );
      messageText = anonymized.anonymizedText;
      piiMasks = anonymized.masks;
    }

    const newUserMessage = await this.createUserMessageUseCase.execute(
      new CreateUserMessageCommand(
        params.thread.id,
        messageText,
        userInput.pendingImages,
        params.skillInstructions,
      ),
    );
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, newUserMessage),
    );
    return { message: newUserMessage, piiMasks };
  }

  private async anonymizeText(
    text: string,
    orgId: UUID,
    threadId: UUID,
  ): Promise<{ anonymizedText: string; masks: ThreadPiiMask[] }> {
    try {
      const result = await this.anonymizeTextForThreadUseCase.execute(
        new AnonymizeTextForThreadCommand(text, orgId, threadId),
      );
      if (result.replacements.length > 0) {
        this.logger.info(
          {
            originalLength: text.length,
            anonymizedLength: result.anonymizedText.length,
            replacementsCount: result.replacements.length,
          },
          'Anonymized text',
        );
      }
      return { anonymizedText: result.anonymizedText, masks: result.masks };
    } catch (error) {
      if (error instanceof AnonymizationInputTooLongError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Anonymization service unavailable',
      );
      throw new RunAnonymizationUnavailableError(
        {
          originalError:
            error instanceof Error ? error.message : 'Unknown error',
        },
        error,
      );
    }
  }
}
