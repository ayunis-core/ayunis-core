import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ToolResultMessageContent } from '../../../../messages/domain/message-contents/tool-result.message-content.entity';
import { Message } from '../../../../messages/domain/message.entity';
import { AddMessageCommand } from '../../../../threads/application/use-cases/add-message-to-thread/add-message.command';
import { TextMessageContent } from '../../../../messages/domain/message-contents/text-message-content.entity';
import { Thread } from '../../../../threads/domain/thread.entity';
import { Tool } from '../../../../tools/domain/tool.entity';
import { CreateUserMessageUseCase } from '../../../../messages/application/use-cases/create-user-message/create-user-message.use-case';
import { CreateUserMessageCommand } from '../../../../messages/application/use-cases/create-user-message/create-user-message.command';
import { CreateToolResultMessageUseCase } from '../../../../messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { CreateToolResultMessageCommand } from '../../../../messages/application/use-cases/create-tool-result-message/create-tool-result-message.command';
import { ToolUseMessageContent } from '../../../../messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from '../../../../messages/domain/message-contents/thinking-message-content.entity';
import { ExecuteToolUseCase } from '../../../../tools/application/use-cases/execute-tool/execute-tool.use-case';
import { CheckToolCapabilitiesUseCase } from '../../../../tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { ExecuteToolCommand } from '../../../../tools/application/use-cases/execute-tool/execute-tool.command';
import { CheckToolCapabilitiesQuery } from '../../../../tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.query';
import { AssistantMessage } from '../../../../messages/domain/messages/assistant-message.entity';
import { GetInferenceUseCase } from '../../../../models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from '../../../../models/application/use-cases/get-inference/get-inference.command';
import { CreateAssistantMessageUseCase } from '../../../../messages/application/use-cases/create-assistant-message/create-assistant-message.use-case';
import { CreateAssistantMessageCommand } from '../../../../messages/application/use-cases/create-assistant-message/create-assistant-message.command';
import { SaveAssistantMessageUseCase } from '../../../../messages/application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { SaveAssistantMessageCommand } from '../../../../messages/application/use-cases/save-assistant-message/save-assistant-message.command';
import {
  RunExecutionFailedError,
  RunInvalidInputError,
  RunMaxIterationsReachedError,
  RunNoModelFoundError,
  RunToolExecutionFailedError,
  RunToolNotFoundError,
} from '../../runs.errors';
import {
  RunTextInput,
  RunToolResultInput,
} from '../../../domain/run-input.entity';
import { ApplicationError } from '../../../../../common/errors/base.error';
import { ToolExecutionFailedError } from '../../../../tools/application/tools.errors';
import { FindThreadQuery } from '../../../../threads/application/use-cases/find-thread/find-thread.query';
import { ExecuteRunCommand } from './execute-run.command';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { StreamInferenceUseCase } from '../../../../models/application/use-cases/stream-inference/stream-inference.use-case';
import {
  StreamInferenceInput,
  StreamInferenceResponseChunk,
} from '../../../../models/application/ports/stream-inference.handler';
import { UUID } from 'crypto';
import langfuse from 'src/common/evals/langfuse';
import { LangfuseTraceClient } from 'langfuse';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ConfigService } from '@nestjs/config';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { safeJsonParse } from 'src/common/util/unicode-sanitizer';

const MAX_TOOL_RESULT_LENGTH = 20000;

@Injectable()
export class ExecuteRunUseCase {
  private readonly logger = new Logger(ExecuteRunUseCase.name);

  constructor(
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createAssistantMessageUseCase: CreateAssistantMessageUseCase,
    private readonly saveAssistantMessageUseCase: SaveAssistantMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly checkToolCapabilitiesUseCase: CheckToolCapabilitiesUseCase,
    private readonly triggerInferenceUseCase: GetInferenceUseCase,
    private readonly streamInferenceUseCase: StreamInferenceUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly assembleToolsUseCase: AssembleToolUseCase,
    private readonly configService: ConfigService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: ExecuteRunCommand,
  ): Promise<AsyncGenerator<Message, void, void>> {
    this.logger.log('executeRun', command);
    try {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId || !orgId) {
        throw new UnauthorizedException('User not authenticated');
      }
      const thread = await this.findThreadUseCase.execute(
        new FindThreadQuery(command.threadId),
      );
      const model = this.pickModel(thread);
      const tools = model.model.canUseTools
        ? await this.assembleTools(thread)
        : [];
      const instructions = this.assemblySystemPrompt(thread);

      const trace = langfuse.trace({
        name: 'execute_run',
        userId: userId,
        metadata: {
          threadId: thread.id,
          model: model.model.name,
          streaming: command.streaming,
        },
        input: command.input,
      });

      // Execute the run
      return this.orchestrateRun({
        thread,
        tools,
        model: model.model,
        input: command.input as RunTextInput | RunToolResultInput,
        instructions,
        streaming: command.streaming,
        trace,
        orgId,
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

  private async assembleTools(thread: Thread): Promise<Tool[]> {
    const isSelfhosted = this.configService.get<boolean>('app.isSelfHosted');
    const isCloudHosted = this.configService.get<boolean>('app.isCloudHosted');
    const tools: Tool[] = [];

    // Add tools from the agent if there is one
    if (thread.agent) {
      tools.push(
        ...thread.agent.tools.filter(
          (tool) => tool.type !== ToolType.INTERNET_SEARCH,
        ),
      );
    }

    // Website content tool is always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.WEBSITE_CONTENT,
        }),
      ),
    );

    // E-Mail tool is always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.SEND_EMAIL,
        }),
      ),
    );

    // Calendar event tool is always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.CREATE_CALENDAR_EVENT,
        }),
      ),
    );

    // Internet search tool is always available
    if (
      isCloudHosted ||
      (isSelfhosted &&
        this.configService.get<boolean>('internetSearch.isAvailable'))
    ) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.INTERNET_SEARCH,
          }),
        ),
      );
    }

    // Source query tool is available if there are sources in the thread or agent
    if (thread.sourceAssignments && thread.sourceAssignments.length > 0) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.SOURCE_QUERY,
            context: thread.sourceAssignments.map(
              (assignment) => assignment.source,
            ),
          }),
        ),
      );
    }
    if (
      thread.agent &&
      thread.agent.sourceAssignments &&
      thread.agent.sourceAssignments.length > 0
    ) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.SOURCE_QUERY,
            context: thread.agent.sourceAssignments.map(
              (assignment) => assignment.source,
            ),
          }),
        ),
      );
    }

    return tools;
  }

  private pickModel(thread: Thread): PermittedLanguageModel {
    if (thread.agent) {
      return thread.agent.model;
    }
    if (thread.model) {
      return thread.model;
    }
    throw new RunNoModelFoundError({
      threadId: thread.id,
      userId: thread.userId,
    });
  }

  private assemblySystemPrompt(thread: Thread): string {
    const currentTime = new Date().toISOString();
    const agentInstructions = thread.agent?.instructions;
    if (!agentInstructions) {
      return `Current time: ${currentTime}`;
    }
    return `Current time: ${currentTime}\n\n${agentInstructions}`;
  }

  private async *orchestrateRun(params: {
    thread: Thread;
    tools: Tool[];
    model: LanguageModel;
    input: RunTextInput | RunToolResultInput;
    instructions?: string;
    streaming?: boolean;
    trace: LangfuseTraceClient;
    orgId: UUID;
  }): AsyncGenerator<Message, void, void> {
    this.logger.log('orchestrateRun', { threadId: params.thread.id });

    /* The order of operation is
     * - collect and yield tool responses - both frontend and backend tools!
     *   (we need to start with this step so we can process frontend tool responses from user and backend
     *    tool responses from backend in one ToolResultMessage)
     * - yield user text message (if first iteration)
     * - yield agent response
     * - check if we need to hand over to the user, if not repeat
     */
    const iterations = 20;
    try {
      for (let i = 0; i < iterations; i++) {
        this.logger.debug('iteration', i);
        const isFirstIteration = i === 0;
        const isLastIteration = i === iterations - 1;
        const textInput =
          params.input instanceof RunTextInput ? params.input : null;
        const toolResultInput =
          params.input instanceof RunToolResultInput ? params.input : null;
        if (!textInput && !toolResultInput) {
          throw new RunInvalidInputError('Invalid input');
        }

        // add frontend tools from user response, call backend tools and add their responses
        const toolResultMessageContent = await this.collectToolResults({
          thread: params.thread,
          tools: params.tools,
          input: toolResultInput,
          trace: params.trace,
          orgId: params.orgId,
        });

        // Add tool result messages to traces and thread if there were any
        if (toolResultMessageContent.length > 0) {
          const toolResultMessage =
            await this.createToolResultMessageUseCase.execute(
              new CreateToolResultMessageCommand(
                params.thread.id,
                toolResultMessageContent,
              ),
            );
          params.trace.event({
            name: 'new_message',
            output: toolResultMessage,
          });
          this.addMessageToThreadUseCase.execute(
            new AddMessageCommand(params.thread, toolResultMessage),
          );
          yield toolResultMessage;
        }

        // Add text message if we have one and it's the first iteration
        if (isFirstIteration && textInput) {
          const newTextMessage = await this.createUserMessageUseCase.execute(
            new CreateUserMessageCommand(params.thread.id, [
              new TextMessageContent(textInput.text),
            ]),
          );
          params.trace.event({
            name: 'new_message',
            input: newTextMessage,
          });
          this.addMessageToThreadUseCase.execute(
            new AddMessageCommand(params.thread, newTextMessage),
          );
          yield newTextMessage;
        }

        let assistantMessage: AssistantMessage;
        try {
          if (params.streaming) {
            // Streaming mode: yield partial messages as they come in
            let finalMessage: AssistantMessage | undefined;

            const generation = params.trace.generation({
              name: 'completion_streaming',
              model: params.model.name,
              input: params.thread.messages,
              completionStartTime: new Date(),
            });
            for await (const partialMessage of this.executeStreamingInference({
              model: params.model,
              messages: params.thread.messages,
              tools: params.tools,
              instructions: params.instructions,
              threadId: params.thread.id,
            })) {
              finalMessage = partialMessage; // Keep track of the last message
              yield partialMessage;
            }

            if (!finalMessage) {
              generation.end({
                output: 'No final message received from streaming inference',
                metadata: {
                  isError: true,
                  error: 'No final message received from streaming inference',
                },
              });
              throw new RunExecutionFailedError(
                'No final message received from streaming inference',
              );
            }

            assistantMessage = finalMessage;
            generation.end({
              output: assistantMessage.content,
            });
            params.trace.event({
              name: 'new_message',
              output: assistantMessage,
            });

            // Final message is already saved to DB by executeStreamingInference
            // So we just need to add it to the thread without saving again
            this.addMessageToThreadUseCase.execute(
              new AddMessageCommand(params.thread, assistantMessage),
            );
          } else {
            // Non-streaming mode: get complete response at once
            const generation = params.trace.generation({
              name: 'completion_non_streaming',
              model: params.model.name,
              input: params.thread.messages,
              completionStartTime: new Date(),
            });
            const inferenceResponse =
              await this.triggerInferenceUseCase.execute(
                new GetInferenceCommand({
                  model: params.model,
                  messages: params.thread.messages,
                  tools: params.tools,
                  toolChoice: ModelToolChoice.AUTO,
                  instructions: params.instructions,
                }),
              );
            generation.end({
              output: inferenceResponse.content,
            });

            assistantMessage = await this.createAssistantMessageUseCase.execute(
              new CreateAssistantMessageCommand(
                params.thread.id,
                inferenceResponse.content,
              ),
            );
            params.trace.event({
              name: 'new_message',
              output: assistantMessage,
            });
            // Add message to thread and yield it
            this.addMessageToThreadUseCase.execute(
              new AddMessageCommand(params.thread, assistantMessage),
            );
            yield assistantMessage;
          }
        } catch (error) {
          if (error instanceof ApplicationError) {
            throw error;
          }
          this.logger.error('Inference failed', error);
          throw new RunExecutionFailedError(
            error instanceof Error ? error.message : 'Inference error',
            { originalError: error as Error },
          );
        }

        if (this.exitLoopAfterAgentResponse(assistantMessage, params.tools)) {
          break;
        }

        // raise an error if we max the loop count
        if (isLastIteration) {
          throw new RunMaxIterationsReachedError(iterations);
        }
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Run execution failed', { error: error as Error });
      throw new RunExecutionFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error as Error },
      );
    }
    return;
  }

  private async collectToolResults(params: {
    thread: Thread;
    tools: Tool[];
    input: RunToolResultInput | null;
    trace: LangfuseTraceClient;
    orgId: UUID;
  }): Promise<ToolResultMessageContent[]> {
    this.logger.debug('collectToolResults');
    const { thread, tools, input, orgId } = params;

    const lastMessage = thread.getLastMessage();
    const toolUseMessageContent = lastMessage
      ? lastMessage.content.filter(
          (content) => content instanceof ToolUseMessageContent,
        )
      : [];

    const toolResultMessageContent: ToolResultMessageContent[] = [];

    for (const content of toolUseMessageContent) {
      const tool = tools.find((tool) => tool.name === content.name);
      if (!tool) {
        throw new RunToolNotFoundError(content.name);
      }

      try {
        const capabilities = this.checkToolCapabilitiesUseCase.execute(
          new CheckToolCapabilitiesQuery(tool),
        );

        if (capabilities.isDisplayable) {
          // frontend tool
          if (input && input.toolId === content.id) {
            // newContent is the tool result of this tool (e.g. user clicked on selection) -> append it
            toolResultMessageContent.push(
              new ToolResultMessageContent(
                input.toolId,
                input.toolName,
                input.result,
              ),
            );
          } else {
            // either the user didn't answer directly to the tool or the tool was just for display
            // adding a response is necessary because some models require a response from every tool
            toolResultMessageContent.push(
              new ToolResultMessageContent(
                content.id,
                content.name,
                'Tool has been displayed successfully',
              ),
            );
          }
        } else if (capabilities.isExecutable) {
          const span = params.trace.span({
            name: `tool__${tool.type}`,
            input: content.params,
            metadata: {
              toolName: tool.name,
            },
          });
          let result = await this.executeToolUseCase
            .execute(new ExecuteToolCommand(tool, content.params, orgId))
            .catch((error) => {
              span.update({
                metadata: {
                  isError: true,
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                },
              });
              span.end({
                output:
                  error instanceof Error ? error.message : 'Unknown error',
              });
              if (
                error instanceof ToolExecutionFailedError &&
                error.exposeToLLM
              ) {
                return `The tool didn't provide any result due to the following error in tool usage: ${error.message}`;
              } else {
                return `The tool didn't provide any result due to an unknown error`;
              }
            });
          span.end({
            output: result,
          });

          if (result.length > MAX_TOOL_RESULT_LENGTH) {
            result = `The tool result was too long to display. Please use the tool in a way that produces a shorter result. Here's the beginning of the result: ${result.substring(0, 200)}`;
          }

          toolResultMessageContent.push(
            new ToolResultMessageContent(content.id, content.name, result),
          );
        }
      } catch (error) {
        if (error instanceof ApplicationError) {
          throw error;
        }
        this.logger.error(`Error processing tool ${content.name}`, error);
        throw new RunToolExecutionFailedError(content.name, {
          error: error as Error,
        });
      }
    }

    return toolResultMessageContent;
  }

  private exitLoopAfterAgentResponse(
    agentResponseMessage: AssistantMessage,
    tools: Tool[],
  ): boolean {
    if (!agentResponseMessage) {
      this.logger.warn(
        'No agent response message provided to exitLoopAfterAgentResponse',
      );
      return true; // Exit loop if there's no message
    }

    // Hand over to the user if the agent only sends text (no tool calls)
    // Or the agent wants to call a tool in the frontend
    const responseContainsOnlyText = agentResponseMessage.content.every(
      (content) => content.type === MessageContentType.TEXT,
    );
    if (responseContainsOnlyText) return true;

    try {
      const responseContainsDisplayTool = agentResponseMessage.content
        .filter((content) => content instanceof ToolUseMessageContent)
        .some((content) => {
          const tool = tools.find((tool) => tool.name === content.name);
          if (!tool) {
            this.logger.warn(
              `Tool ${content.name} mentioned in response but not found`,
            );
            return false;
          }

          return this.checkToolCapabilitiesUseCase.execute(
            new CheckToolCapabilitiesQuery(tool),
          ).isDisplayable;
        });
      if (responseContainsDisplayTool) return true;
    } catch (error) {
      this.logger.error('Error checking for display tools', error);
      // Don't throw here, just log and continue with the default behavior
    }

    return false;
  }

  private async *executeStreamingInference(params: {
    model: LanguageModel;
    messages: Message[];
    tools: Tool[];
    instructions?: string;
    threadId: UUID;
  }): AsyncGenerator<AssistantMessage, void, unknown> {
    const { model, messages, tools, instructions, threadId } = params;

    // Create streaming inference input
    const streamInput = new StreamInferenceInput({
      model,
      messages,
      systemPrompt: instructions || '',
      tools,
      toolChoice: ModelToolChoice.AUTO,
    });

    // Start streaming
    const stream$ = this.streamInferenceUseCase.execute(streamInput);

    // Create the assistant message upfront with empty content - this gives us a consistent ID
    const assistantMessage = new AssistantMessage({
      threadId,
      content: [],
    });

    // Accumulate content for the message
    let accumulatedText = '';
    let accumulatedThinking = '';
    const accumulatedToolCalls = new Map<
      number,
      {
        id: string | null;
        name: string | null;
        arguments: string;
      }
    >();

    // Convert observable to async iterable
    const asyncIterable = {
      [Symbol.asyncIterator]() {
        let completed = false;
        let error: any = null;
        const chunks: StreamInferenceResponseChunk[] = [];

        const subscription = stream$.subscribe({
          next: (chunk) => chunks.push(chunk),
          error: (err) => {
            error = err as Error;
            completed = true;
          },
          complete: () => {
            completed = true;
          },
        });

        return {
          async next() {
            while (chunks.length === 0 && !completed) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }

            if (error) {
              subscription.unsubscribe();
              throw error;
            }

            if (chunks.length > 0) {
              const chunk = chunks.shift()!;
              return { value: chunk, done: false };
            } else {
              subscription.unsubscribe();
              return { done: true, value: undefined };
            }
          },
        };
      },
    };

    // Process streaming chunks
    for await (const chunk of asyncIterable) {
      if (!chunk) continue; // Skip undefined chunks

      let shouldUpdate = false;

      // Accumulate thinking content
      if (chunk.thinkingDelta) {
        accumulatedThinking += chunk.thinkingDelta;
        shouldUpdate = true;
      }

      // Accumulate text content
      if (chunk.textContentDelta) {
        accumulatedText += chunk.textContentDelta;
        shouldUpdate = true;
      }

      // Accumulate tool calls
      chunk.toolCallsDelta.forEach((toolCall) => {
        const existing = accumulatedToolCalls.get(toolCall.index) || {
          id: null,
          name: null,
          arguments: '',
        };

        accumulatedToolCalls.set(toolCall.index, {
          id: toolCall.id || existing.id,
          name: toolCall.name || existing.name,
          arguments: existing.arguments + (toolCall.argumentsDelta || ''),
        });
        shouldUpdate = true;
      });

      // Yield updated message if there were changes
      if (shouldUpdate) {
        const messageContent: Array<
          TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
        > = [];

        // Add thinking content if present
        if (accumulatedThinking.trim()) {
          messageContent.push(new ThinkingMessageContent(accumulatedThinking));
        }

        // Add text content if present
        if (accumulatedText.trim()) {
          messageContent.push(new TextMessageContent(accumulatedText));
        }

        // Add complete tool calls only
        accumulatedToolCalls.forEach((toolCall) => {
          if (toolCall.id && toolCall.name && toolCall.arguments) {
            try {
              const parsedArgs = safeJsonParse(
                toolCall.arguments,
                {},
              ) as object;
              if (parsedArgs) {
                messageContent.push(
                  new ToolUseMessageContent(
                    toolCall.id,
                    toolCall.name,
                    parsedArgs,
                  ),
                );
              }
            } catch {
              this.logger.debug(`Incomplete tool call for ${toolCall.name}`, {
                arguments: toolCall.arguments,
              });
              // Don't add incomplete tool calls yet
            }
          }
        });

        // Update the same assistant message with new content
        assistantMessage.content = messageContent;

        yield assistantMessage;
      }
    }

    // Build final message content
    const finalMessageContent: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    > = [];

    // Add thinking content if present
    if (accumulatedThinking.trim()) {
      finalMessageContent.push(new ThinkingMessageContent(accumulatedThinking));
    }

    // Add text content if present
    if (accumulatedText.trim()) {
      finalMessageContent.push(new TextMessageContent(accumulatedText));
    }

    // Add tool calls if present
    accumulatedToolCalls.forEach((toolCall) => {
      if (toolCall.id && toolCall.name) {
        try {
          const parsedArgs = safeJsonParse(toolCall.arguments, {}) as object;
          if (parsedArgs) {
            finalMessageContent.push(
              new ToolUseMessageContent(toolCall.id, toolCall.name, parsedArgs),
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to parse tool arguments for ${toolCall.name}`,
            {
              arguments: toolCall.arguments,
              error: error as Error,
            },
          );
        }
      }
    });

    // Update the assistant message with final complete content
    assistantMessage.content = finalMessageContent;

    // Save the assistant message to database (preserving the consistent ID)
    // No need to yield again - we already yielded the complete message during streaming
    await this.saveAssistantMessageUseCase.execute(
      new SaveAssistantMessageCommand(assistantMessage),
    );
  }
}
