import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
  ThreadAgentNoLongerAccessibleError,
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
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindOneAgentQuery } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.query';
import { AgentNotFoundError } from 'src/domain/agents/application/agents.errors';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { CreditBudgetGuardService } from '../../services/credit-budget-guard.service';
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import { tierToFairUseQuotaType } from 'src/iam/quotas/domain/tier-to-quota-type';
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
    private readonly findOneAgentUseCase: FindOneAgentUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly contextService: ContextService,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
    private readonly checkQuotaUseCase: CheckQuotaUseCase,
    private readonly creditBudgetGuardService: CreditBudgetGuardService,
    private readonly toolAssemblyService: ToolAssemblyService,
    private readonly toolResultCollectorService: ToolResultCollectorService,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly inferenceOrchestratorService: InferenceOrchestratorService,
    private readonly skillActivationService: SkillActivationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<Message, void, void>> {
    this.logger.log('executeRun', {
      threadId: command.threadId,
      streaming: command.streaming,
      inputType: command.input.constructor.name,
    });
    try {
      const principal = this.contextService.requirePrincipal();
      // Thread-based runs are user-only; api-key callers reach inference via
      // `/openai/v1/chat/completions` which bypasses this use case.
      if (principal.kind !== 'user') {
        throw new UnauthorizedException(
          'Thread runs are not available for API key callers.',
        );
      }
      const userId = principal.userId;
      const orgId = principal.orgId;

      // Counts "attempted runs" — fires before run validity is established.
      // This is intentional: it serves as the DAU (daily active users) metric.
      this.eventEmitter
        .emitAsync(
          RunExecutedEvent.EVENT_NAME,
          new RunExecutedEvent('user', userId, null, orgId),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit RunExecutedEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            userId,
          });
        });

      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );
      const agent = await this.resolveThreadAgent(thread, command.threadId);
      const model = this.pickModel(thread, agent);

      // Enforce fair-use + credit budget AFTER pickModel so the tiered quota
      // bucket matches the resolved model. Untiered models default to MEDIUM;
      // ZERO-tier models return null and bypass the check entirely.
      const fairUseQuotaType = tierToFairUseQuotaType(model.model.tier);
      if (fairUseQuotaType !== null) {
        await this.checkQuotaUseCase.execute(
          new CheckQuotaQuery({ kind: 'user', userId }, fairUseQuotaType),
        );
      }
      await this.creditBudgetGuardService.ensureBudgetAvailable(orgId);

      const effectiveIsAnonymous = thread.isAnonymous || model.anonymousOnly;
      const activeSkills = await this.toolAssemblyService.findActiveSkills();
      const { tools, instructions } =
        await this.toolAssemblyService.buildRunContext(
          thread,
          agent,
          activeSkills,
          model.model.canUseTools,
        );

      return this.orchestrateRun({
        thread,
        tools,
        model: model.model,
        input: command.input as RunUserInput | RunToolResultInput,
        instructions,
        streaming: command.streaming,
        orgId,
        isAnonymous: effectiveIsAnonymous,
        agent,
        activeSkills,
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

  /**
   * Resolves the agent for a thread, throwing if it's no longer accessible.
   */
  private async resolveThreadAgent(
    thread: Thread,
    threadId: UUID,
  ): Promise<Agent | undefined> {
    if (!thread.agentId) return undefined;
    try {
      return (
        await this.findOneAgentUseCase.execute(
          new FindOneAgentQuery(thread.agentId),
        )
      ).agent;
    } catch (error) {
      if (error instanceof AgentNotFoundError) {
        throw new ThreadAgentNoLongerAccessibleError(threadId, thread.agentId);
      }
      throw error;
    }
  }

  private pickModel(thread: Thread, agent?: Agent): PermittedLanguageModel {
    if (agent) {
      return agent.model;
    }
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
  ): AsyncGenerator<Message, void, void> {
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
  ): AsyncGenerator<Message, void, void> {
    if (params.skillId) {
      await this.activateSkillOnThread(params);
    }
    if (userInput) {
      yield await this.processUserMessage(params, userInput);
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
  ): AsyncGenerator<Message, void, void> {
    const toolResultMessageContent =
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
      params.agent,
      params.activeSkills,
      params.model.canUseTools,
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
  ): Promise<Message> {
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

    const messageText =
      hasText && params.isAnonymous
        ? await this.anonymizeText(userInput.text)
        : userInput.text;

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
    return newUserMessage;
  }

  private async anonymizeText(text: string): Promise<string> {
    try {
      const result = await this.anonymizeTextUseCase.execute(
        new AnonymizeTextCommand(text),
      );
      if (result.replacements.length > 0) {
        this.logger.log('Anonymized text', {
          originalLength: text.length,
          anonymizedLength: result.anonymizedText.length,
          replacementsCount: result.replacements.length,
        });
      }
      return result.anonymizedText;
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
