import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Message } from '../../../../messages/domain/message.entity';
import { AddMessageCommand } from '../../../../threads/application/use-cases/add-message-to-thread/add-message.command';
import { Thread } from '../../../../threads/domain/thread.entity';
import { CreateUserMessageUseCase } from '../../../../messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateUserMessageCommand } from '../../../../messages/application/use-cases/create-user-message/create-user-message.command';
import { CreateToolResultMessageUseCase } from '../../../../messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from '../../../../messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import {
  RunAnonymizationUnavailableError,
  RunExecutionFailedError,
  RunInvalidInputError,
  RunMaxIterationsReachedError,
  RunNoModelFoundError,
  UnexpectedRunError,
} from '../../runs.errors';
import {
  RunUserInput,
  RunToolResultInput,
} from '../../../domain/run-input.entity';
import { ApplicationError } from '../../../../../common/errors/base.error';
import { FindThreadQuery } from '../../../../threads/application/use-cases/find-thread/find-thread.query';
import { ExecuteRunCommand } from './execute-run.command';
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
} from '../../../domain/run-pii-masks-update.entity';
import { InferenceUsageGuard } from '../../services/inference-usage-guard.service';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import { ToolAssemblyService } from '../../services/tool-assembly.service';
import { ToolResultCollectorService } from '../../services/tool-result-collector.service';
import { MessageCleanupService } from '../../services/message-cleanup.service';
import { InferenceOrchestratorService } from '../../services/inference-orchestrator.service';
import type { RunParams } from './run-params.interface';
import { RunExecutedEvent } from '../../events/run-executed.event';

@Injectable()
export class ExecuteRunUseCase {
  private readonly logger = new Logger(ExecuteRunUseCase.name);

  constructor(
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly contextService: ContextService,
    private readonly anonymizeTextForThreadUseCase: AnonymizeTextForThreadUseCase,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly toolAssemblyService: ToolAssemblyService,
    private readonly toolResultCollectorService: ToolResultCollectorService,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly inferenceOrchestratorService: InferenceOrchestratorService,
    private readonly skillActivationService: SkillActivationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<RunStreamItem, void, void>> {
    this.logger.log('executeRun', {
      threadId: command.threadId,
      streaming: command.streaming,
      inputType: command.input.constructor.name,
    });
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
        skillId:
          command.input instanceof RunUserInput
            ? command.input.skillId
            : undefined,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
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
  }> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedException('User not authenticated');
    }
    this.emitRunExecuted(userId, orgId);

    const { thread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(command.threadId),
    );
    const model = this.pickModel(thread);

    // Enforce fair-use + credit budget AFTER pickModel so the tiered quota
    // bucket matches the resolved model. Untiered models default to MEDIUM;
    // ZERO-tier models return null and bypass the check entirely.
    await this.inferenceUsageGuard.preflight({ userId, orgId }, model.model);

    const isAnonymous = thread.isAnonymous || model.anonymousOnly;
    const activeSkills = await this.toolAssemblyService.findActiveSkills();
    const { tools, instructions } =
      await this.toolAssemblyService.buildRunContext(
        thread,
        activeSkills,
        model.model.canUseTools,
        isAnonymous,
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
    };
  }

  // Counts "attempted runs" — fires before run validity is established.
  // This is intentional: it serves as the DAU (daily active users) metric.
  private emitRunExecuted(userId: UUID, orgId: UUID): void {
    this.eventEmitter
      .emitAsync(
        RunExecutedEvent.EVENT_NAME,
        new RunExecutedEvent(userId, orgId),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit RunExecutedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
          userId,
        });
      });
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
  ): AsyncGenerator<RunStreamItem, void, void> {
    this.logger.log('orchestrateRun', { threadId: params.thread.id });
    const iterations = 20;
    let succeeded = false;
    try {
      for (let i = 0; i < iterations; i++) {
        this.logger.debug('iteration', i);
        const { userInput, toolResultInput } = this.parseInput(params.input);

        yield* this.processToolResults(params, toolResultInput);

        if (i === 0) {
          yield* this.handleFirstIteration(params, userInput);
        }

        const assistantMessage =
          yield* this.inferenceOrchestratorService.runInference(params);

        if (
          this.toolResultCollectorService.exitLoopAfterAgentResponse(
            assistantMessage,
            params.tools,
          )
        ) {
          break;
        }
        if (i === iterations - 1) {
          throw new RunMaxIterationsReachedError(iterations);
        }
      }
      succeeded = true;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Run execution failed', { error: error as Error });
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error as Error },
      );
    } finally {
      // Clean up orphaned messages only on failure/interruption.
      // On the success path the orchestration loop already leaves the
      // thread in a valid state — running cleanup there risks deleting
      // intentional terminal messages (e.g., display-only tool_use).
      // Using finally (not catch) so cleanup also runs when the generator
      // is early-returned via .return() on client disconnect.
      if (!succeeded) {
        await this.messageCleanupService.cleanupTrailingNonAssistantMessages(
          params.thread.id,
        );
      }
    }
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

  private parseInput(input: RunUserInput | RunToolResultInput): {
    userInput: RunUserInput | null;
    toolResultInput: RunToolResultInput | null;
  } {
    const userInput = input instanceof RunUserInput ? input : null;
    const toolResultInput = input instanceof RunToolResultInput ? input : null;
    if (!userInput && !toolResultInput) {
      throw new RunInvalidInputError('Invalid input');
    }
    return { userInput, toolResultInput };
  }

  private async *processToolResults(
    params: RunParams,
    toolResultInput: RunToolResultInput | null,
  ): AsyncGenerator<RunStreamItem, void, void> {
    const { contents: toolResultMessageContent, piiMasks } =
      await this.toolResultCollectorService.collectToolResults({
        thread: params.thread,
        tools: params.tools,
        input: toolResultInput,
        orgId: params.orgId,
        isAnonymous: params.isAnonymous,
      });

    if (toolResultMessageContent.length === 0) return;

    const toolResultMessage = await this.createToolResultMessageUseCase.execute(
      new CreateToolResultMessageCommand(
        params.thread.id,
        toolResultMessageContent,
      ),
    );
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, toolResultMessage),
    );
    // Masks first, so the client can resolve tokens in the message below.
    if (piiMasks) {
      yield new RunPiiMasksUpdate(piiMasks);
    }
    yield toolResultMessage;

    const skillWasActivated = toolResultMessageContent.some(
      (content) => content.toolName === (ToolType.ACTIVATE_SKILL as string),
    );
    if (skillWasActivated) {
      await this.refreshRunContext(params);
    }
  }

  private async activateSkillOnThread(params: RunParams): Promise<void> {
    if (!params.skillId) return;

    const { instructions, skillName } =
      await this.skillActivationService.activateOnThread(
        params.skillId,
        params.thread,
      );

    params.activatedSkillName = skillName;
    await this.refreshRunContext(params);
    params.skillInstructions = instructions;
  }

  private appendSkillActivatedNote(
    instructions: string | undefined,
    skillName: string,
  ): string {
    const note = `<already_activated_skill>
Skill "${skillName}" has already been activated on this thread. Do not call activate_skill for this skill.
</already_activated_skill>`;
    return instructions ? `${instructions}\n\n${note}` : note;
  }

  private async refreshRunContext(params: RunParams): Promise<void> {
    const { thread: refreshedThread } = await this.findThreadUseCase.execute(
      new FindThreadQuery(params.thread.id),
    );
    params.thread = refreshedThread;
    const refreshed = await this.toolAssemblyService.buildRunContext(
      refreshedThread,
      params.activeSkills,
      params.model.canUseTools,
      params.isAnonymous,
    );
    params.tools = refreshed.tools;
    params.instructions = refreshed.instructions;

    if (params.activatedSkillName) {
      params.instructions = this.appendSkillActivatedNote(
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
        this.logger.log('Anonymized text', {
          originalLength: text.length,
          anonymizedLength: result.anonymizedText.length,
          replacementsCount: result.replacements.length,
        });
      }
      return { anonymizedText: result.anonymizedText, masks: result.masks };
    } catch (error) {
      this.logger.error('Anonymization service unavailable', {
        error: error as Error,
      });
      throw new RunAnonymizationUnavailableError({
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
