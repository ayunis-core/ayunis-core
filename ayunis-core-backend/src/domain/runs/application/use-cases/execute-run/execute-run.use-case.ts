import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Message } from '../../../../messages/domain/message.entity';
import { AddMessageCommand } from '../../../../threads/application/use-cases/add-message-to-thread/add-message.command';
import { Thread } from '../../../../threads/domain/thread.entity';
import { Tool } from '../../../../tools/domain/tool.entity';
import { CreateUserMessageUseCase } from '../../../../messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateUserMessageCommand } from '../../../../messages/application/use-cases/create-user-message/create-user-message.command';
import { CreateToolResultMessageUseCase } from '../../../../messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from '../../../../messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import { AssistantMessage } from '../../../../messages/domain/messages/assistant-message.entity';
import { GetInferenceUseCase } from '../../../../models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from '../../../../models/application/use-cases/get-inference/get-inference.command';
import { CreateAssistantMessageUseCase } from '../../../../messages/application/use-cases/create-assistant-message/create-assistant-message.use-case';
import { CreateAssistantMessageCommand } from '../../../../messages/application/use-cases/create-assistant-message/create-assistant-message.command';
import {
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
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { UUID } from 'crypto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindOneAgentQuery } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.query';
import { AgentNotFoundError } from 'src/domain/agents/application/agents.errors';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';
import { CollectUsageAsyncService } from '../../services/collect-usage-async.service';
import { TrimMessagesForContextUseCase } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.use-case';
import { TrimMessagesForContextCommand } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ToolAssemblyService } from '../../services/tool-assembly.service';
import { ToolResultCollectorService } from '../../services/tool-result-collector.service';
import { MessageCleanupService } from '../../services/message-cleanup.service';
import { StreamingInferenceService } from '../../services/streaming-inference.service';

const MAX_CONTEXT_TOKENS = 80000;

@Injectable()
export class ExecuteRunUseCase {
  private readonly logger = new Logger(ExecuteRunUseCase.name);

  constructor(
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createAssistantMessageUseCase: CreateAssistantMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly triggerInferenceUseCase: GetInferenceUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly findOneAgentUseCase: FindOneAgentUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly contextService: ContextService,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
    private readonly trimMessagesForContextUseCase: TrimMessagesForContextUseCase,
    private readonly toolAssemblyService: ToolAssemblyService,
    private readonly toolResultCollectorService: ToolResultCollectorService,
    private readonly messageCleanupService: MessageCleanupService,
    private readonly streamingInferenceService: StreamingInferenceService,
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
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId || !orgId) {
        throw new UnauthorizedException('User not authenticated');
      }
      const { thread } = await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );
      // Fetch the agent separately to prevent accidental access of not-shared-anymore agents
      let agent: Agent | undefined;
      if (thread.agentId) {
        try {
          // This will fail if the agent is no longer accessible (not owned or shared)
          agent = (
            await this.findOneAgentUseCase.execute(
              new FindOneAgentQuery(thread.agentId),
            )
          ).agent;
        } catch (error) {
          // If agent is not found or not accessible, throw a specific error
          // that the frontend can handle to show a disclaimer
          if (error instanceof AgentNotFoundError) {
            throw new ThreadAgentNoLongerAccessibleError(
              command.threadId,
              thread.agentId,
            );
          }
          throw error;
        }
      }
      const model = this.pickModel(thread, agent);
      // Effective anonymous mode: enabled if thread is anonymous OR model enforces it
      const effectiveIsAnonymous = thread.isAnonymous || model.anonymousOnly;

      // Fetch active skills for the current user
      const activeSkills = await this.toolAssemblyService.findActiveSkills();

      // Build initial run context (tools + instructions)
      const { tools, instructions } =
        await this.toolAssemblyService.buildRunContext(
          thread,
          agent,
          activeSkills,
          model.model.canUseTools,
        );

      // Execute the run
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
    try {
      for (let i = 0; i < iterations; i++) {
        this.logger.debug('iteration', i);
        const { userInput, toolResultInput } = this.parseInput(params.input);

        yield* this.processToolResults(params, toolResultInput);

        if (i === 0 && userInput) {
          yield await this.processUserMessage(params, userInput);
        }

        const assistantMessage = yield* this.runInference(params);

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
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Run execution failed', { error: error as Error });
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error as Error },
      );
    } finally {
      await this.messageCleanupService.cleanupTrailingNonAssistantMessages(
        params.thread.id,
        null,
      );
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
  }

  private async processUserMessage(
    params: RunParams,
    userInput: RunUserInput,
  ): Promise<Message> {
    const hasText = userInput.text && userInput.text.trim().length > 0;
    const hasImages = userInput.pendingImages.length > 0;

    if (!hasText && !hasImages) {
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
      ),
    );
    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, newUserMessage),
    );
    return newUserMessage;
  }

  private async *runInference(
    params: RunParams,
  ): AsyncGenerator<Message, AssistantMessage, void> {
    const trimmedMessages = this.trimMessagesForInference(
      params.thread.messages,
    );

    try {
      if (params.streaming) {
        return yield* this.runStreamingInference(params, trimmedMessages);
      }
      return yield* this.runNonStreamingInference(params, trimmedMessages);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Inference failed', error);
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Inference error',
        { originalError: error as Error },
      );
    }
  }

  private async *runStreamingInference(
    params: RunParams,
    trimmedMessages: Message[],
  ): AsyncGenerator<Message, AssistantMessage, void> {
    let finalMessage: AssistantMessage | undefined;

    for await (const partialMessage of this.streamingInferenceService.executeStreamingInference(
      {
        model: params.model,
        messages: trimmedMessages,
        tools: params.tools,
        instructions: params.instructions,
        threadId: params.thread.id,
        orgId: params.orgId,
      },
    )) {
      finalMessage = partialMessage;
      yield partialMessage;
    }

    if (!finalMessage) {
      throw new RunExecutionFailedError(
        'No final message received from streaming inference',
      );
    }

    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, finalMessage),
    );
    return finalMessage;
  }

  private async *runNonStreamingInference(
    params: RunParams,
    trimmedMessages: Message[],
  ): AsyncGenerator<Message, AssistantMessage, void> {
    const inferenceResponse = await this.triggerInferenceUseCase.execute(
      new GetInferenceCommand({
        model: params.model,
        messages: trimmedMessages,
        tools: params.tools,
        toolChoice: ModelToolChoice.AUTO,
        instructions: params.instructions,
      }),
    );

    const assistantMessage = await this.createAssistantMessageUseCase.execute(
      new CreateAssistantMessageCommand(
        params.thread.id,
        inferenceResponse.content,
      ),
    );

    if (
      inferenceResponse.meta.inputTokens !== undefined &&
      inferenceResponse.meta.outputTokens !== undefined
    ) {
      this.collectUsage(
        params.model,
        inferenceResponse.meta.inputTokens,
        inferenceResponse.meta.outputTokens,
        assistantMessage.id,
      );
    }

    this.addMessageToThreadUseCase.execute(
      new AddMessageCommand(params.thread, assistantMessage),
    );
    yield assistantMessage;
    return assistantMessage;
  }

  /**
   * Anonymizes text by removing PII if the thread is in anonymous mode.
   * Uses German language for anonymization (default for German public administration).
   */
  private async anonymizeText(text: string): Promise<string> {
    try {
      const result = await this.anonymizeTextUseCase.execute(
        new AnonymizeTextCommand(text, 'de'),
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
      this.logger.error('Failed to anonymize text, returning original', {
        error: error as Error,
      });
      // Return original text on anonymization failure to not block the conversation
      return text;
    }
  }

  private collectUsage(
    model: LanguageModel,
    inputTokens: number,
    outputTokens: number,
    messageId?: UUID,
  ): void {
    this.collectUsageAsyncService.collect(
      model,
      inputTokens,
      outputTokens,
      messageId,
    );
  }

  private trimMessagesForInference(messages: Message[]): Message[] {
    return this.trimMessagesForContextUseCase.execute(
      new TrimMessagesForContextCommand(messages, MAX_CONTEXT_TOKENS),
    );
  }
}

interface RunParams {
  thread: Thread;
  tools: Tool[];
  model: LanguageModel;
  input: RunUserInput | RunToolResultInput;
  instructions?: string;
  streaming?: boolean;
  orgId: UUID;
  isAnonymous: boolean;
  agent?: Agent;
  activeSkills: Skill[];
}
