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
import { DeleteMessageUseCase } from '../../../../messages/application/use-cases/delete-message/delete-message.use-case';
import { DeleteMessageCommand } from '../../../../messages/application/use-cases/delete-message/delete-message.command';
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
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ConfigService } from '@nestjs/config';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { safeJsonParse } from 'src/common/util/unicode-sanitizer';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { DiscoverMcpCapabilitiesUseCase } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import { DiscoverMcpCapabilitiesQuery } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.query';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindOneAgentQuery } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.query';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { AnonymizeTextCommand } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.command';

const MAX_TOOL_RESULT_LENGTH = 20000;

@Injectable()
export class ExecuteRunUseCase {
  private readonly logger = new Logger(ExecuteRunUseCase.name);

  constructor(
    private readonly createUserMessageUseCase: CreateUserMessageUseCase,
    private readonly createAssistantMessageUseCase: CreateAssistantMessageUseCase,
    private readonly saveAssistantMessageUseCase: SaveAssistantMessageUseCase,
    private readonly createToolResultMessageUseCase: CreateToolResultMessageUseCase,
    private readonly deleteMessageUseCase: DeleteMessageUseCase,
    private readonly executeToolUseCase: ExecuteToolUseCase,
    private readonly checkToolCapabilitiesUseCase: CheckToolCapabilitiesUseCase,
    private readonly triggerInferenceUseCase: GetInferenceUseCase,
    private readonly streamInferenceUseCase: StreamInferenceUseCase,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly findOneAgentUseCase: FindOneAgentUseCase,
    private readonly addMessageToThreadUseCase: AddMessageToThreadUseCase,
    private readonly assembleToolsUseCase: AssembleToolUseCase,
    private readonly configService: ConfigService,
    private readonly contextService: ContextService,
    private readonly discoverMcpCapabilitiesUseCase: DiscoverMcpCapabilitiesUseCase,
    private readonly anonymizeTextUseCase: AnonymizeTextUseCase,
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
      // Fetch the agent separately to prevent accidental access of not-shared-anymore agents
      let agent: Agent | undefined;
      if (thread.agentId) {
        // This will fail if the agent is no longer accessible (not owned or shared)
        agent = (
          await this.findOneAgentUseCase.execute(
            new FindOneAgentQuery(thread.agentId),
          )
        ).agent;
      }
      const model = this.pickModel(thread, agent);

      // Assemble tools (native + MCP)
      const tools = model.model.canUseTools
        ? await this.assembleTools(thread, agent)
        : [];
      const instructions = this.assemblySystemPrompt(agent);

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

  private async assembleTools(thread: Thread, agent?: Agent): Promise<Tool[]> {
    const isSelfhosted = this.configService.get<boolean>('app.isSelfHosted');
    const isCloudHosted = this.configService.get<boolean>('app.isCloudHosted');
    const tools: Tool[] = [];

    if (agent) {
      // Discover MCP capabilities if agent has integrations
      if (agent.mcpIntegrationIds.length > 0) {
        const mcpCapabilities = await Promise.all(
          agent.mcpIntegrationIds.map((integrationId) =>
            this.discoverMcpCapabilitiesUseCase.execute(
              new DiscoverMcpCapabilitiesQuery(integrationId),
            ),
          ),
        );
        // Add MCP tools and resources
        tools.push(
          ...mcpCapabilities.flatMap((capability) =>
            capability.tools.map(
              (tool) => new McpIntegrationTool(tool, capability.returnsPii),
            ),
          ),
          ...mcpCapabilities.flatMap((capability) =>
            capability.resources.map(
              (resource) =>
                new McpIntegrationResource(resource, capability.returnsPii),
            ),
          ),
        );
      }

      // Add native tools from the agent (excluding always-available tools)
      tools.push(
        ...agent.tools.filter(
          (tool) =>
            tool.type !== ToolType.INTERNET_SEARCH &&
            tool.type !== ToolType.BAR_CHART &&
            tool.type !== ToolType.LINE_CHART &&
            tool.type !== ToolType.PIE_CHART,
        ),
      );
    }

    // Code execution tool is always available
    const threadSources = thread.sourceAssignments?.map(
      (assignment) => assignment.source,
    );
    const agentSources = agent?.sourceAssignments?.map(
      (assignment) => assignment.source,
    );
    const codeExecutionSources = [
      ...(threadSources ?? []),
      ...(agentSources ?? []),
    ].filter((source) => source.type === SourceType.DATA);
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.CODE_EXECUTION,
          context: codeExecutionSources,
        }),
      ),
    );

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

    // Chart tools are always available
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.BAR_CHART,
        }),
      ),
    );
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.LINE_CHART,
        }),
      ),
    );
    tools.push(
      await this.assembleToolsUseCase.execute(
        new AssembleToolCommand({
          type: ToolType.PIE_CHART,
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
            context: thread.sourceAssignments
              .map((assignment) => assignment.source)
              .filter((source) => source instanceof TextSource),
          }),
        ),
      );
    }
    if (
      agent &&
      agent.sourceAssignments &&
      agent.sourceAssignments.length > 0
    ) {
      tools.push(
        await this.assembleToolsUseCase.execute(
          new AssembleToolCommand({
            type: ToolType.SOURCE_QUERY,
            context: agent.sourceAssignments
              .map((assignment) => assignment.source)
              .filter((source) => source instanceof TextSource),
          }),
        ),
      );
    }

    return tools;
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

  private assemblySystemPrompt(agent?: Agent): string {
    const currentTime = new Date().toISOString();
    const systemPrompt = `
    !! IMPORTANT !! ALWAYS ANSWER IN THE SAME LANGUAGE AS THE USER'S MESSAGE !! NOT ANSWERING IN THE SAME LANGUAGE AS THE USER'S MESSAGE IS A CRITICAL ERROR !!
      Current time: ${currentTime}
    `.trim();
    const agentInstructions = agent?.instructions;
    if (!agentInstructions) {
      return systemPrompt;
    }
    return `${systemPrompt}\n\n${agentInstructions}`;
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
          // Anonymize user message text if thread is in anonymous mode
          const messageText = params.thread.isAnonymous
            ? await this.anonymizeText(textInput.text)
            : textInput.text;
          const newTextMessage = await this.createUserMessageUseCase.execute(
            new CreateUserMessageCommand(params.thread.id, [
              new TextMessageContent(messageText),
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
        toolResultMessageContent.push(
          new ToolResultMessageContent(
            content.id,
            content.name,
            `A tool with the name ${content.name} was not found. Only use tools that are available in your given list of tools.`,
          ),
        );
        continue;
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
          const context = {
            orgId,
            threadId: thread.id,
          };
          let result = await this.executeToolUseCase
            .execute(new ExecuteToolCommand(tool, content.params, context))
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

          // Anonymize tool result if thread is in anonymous mode and tool may return PII
          if (thread.isAnonymous && tool.returnsPii) {
            result = await this.anonymizeText(result);
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

    // Hand over to the user if the agent does not want to call any tools
    // Or the agent wants to call a tool in the frontend
    const responseDoesNotContainToolCalls = agentResponseMessage.content.every(
      (content) => content.type !== MessageContentType.TOOL_USE,
    );
    if (responseDoesNotContainToolCalls) return true;

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

    // Accumulate content for the message - use objects to allow mutation by reference
    const accumulatedText = { value: '' };
    const accumulatedThinking = { value: '' };
    const accumulatedToolCalls = new Map<
      number,
      {
        id: string | null;
        name: string | null;
        arguments: string;
      }
    >();

    // Track whether streaming completed successfully or was interrupted
    let streamCompletedSuccessfully = false;

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
              return { value: chunk, done: false } as IteratorResult<
                StreamInferenceResponseChunk,
                void
              >;
            } else {
              subscription.unsubscribe();
              streamCompletedSuccessfully = true; // Mark as completed
              return {
                done: true,
                value: undefined,
              } as IteratorReturnResult<void>;
            }
          },
        };
      },
    } as AsyncIterable<StreamInferenceResponseChunk>;

    try {
      // Process streaming chunks using extracted method
      for await (const message of this.processStreamingChunks({
        asyncIterable,
        assistantMessage,
        accumulatedText,
        accumulatedThinking,
        accumulatedToolCalls,
      })) {
        yield message;
      }
    } finally {
      // Save the assistant message with accumulated content
      const savedMessageId =
        await this.saveAssistantMessageWithAccumulatedContent(
          threadId,
          accumulatedText.value,
          accumulatedThinking.value,
          accumulatedToolCalls,
          assistantMessage,
          streamCompletedSuccessfully,
        );

      // Ensure thread ends with assistant message by cleaning up any trailing messages
      await this.cleanupTrailingNonAssistantMessages(threadId, savedMessageId);
    }
  }

  private async *processStreamingChunks(params: {
    asyncIterable: AsyncIterable<StreamInferenceResponseChunk>;
    assistantMessage: AssistantMessage;
    accumulatedText: { value: string };
    accumulatedThinking: { value: string };
    accumulatedToolCalls: Map<
      number,
      {
        id: string | null;
        name: string | null;
        arguments: string;
      }
    >;
  }): AsyncGenerator<AssistantMessage, void, void> {
    const {
      asyncIterable,
      assistantMessage,
      accumulatedText,
      accumulatedThinking,
      accumulatedToolCalls,
    } = params;

    for await (const chunk of asyncIterable) {
      if (!chunk) continue; // Skip undefined chunks

      let shouldUpdate = false;

      // Accumulate thinking content
      if (chunk.thinkingDelta) {
        accumulatedThinking.value += chunk.thinkingDelta;
        shouldUpdate = true;
      }

      // Accumulate text content
      if (chunk.textContentDelta) {
        accumulatedText.value += chunk.textContentDelta;
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
        if (accumulatedThinking.value.trim()) {
          messageContent.push(
            new ThinkingMessageContent(accumulatedThinking.value),
          );
        }

        // Add text content if present
        if (accumulatedText.value.trim()) {
          messageContent.push(new TextMessageContent(accumulatedText.value));
        }

        // Add tool calls (complete or in-progress)
        accumulatedToolCalls.forEach((toolCall) => {
          if (toolCall.id && toolCall.name) {
            // Try to parse arguments if they exist
            let parsedArgs: object = {};
            if (toolCall.arguments) {
              try {
                const parsed = safeJsonParse(toolCall.arguments, null) as
                  | object
                  | null;
                if (parsed) {
                  parsedArgs = parsed;
                }
              } catch {
                this.logger.debug(
                  `Incomplete tool call arguments for ${toolCall.name}`,
                  {
                    arguments: toolCall.arguments,
                  },
                );
                // Use empty params for incomplete tool calls - this allows the frontend
                // to show a placeholder/loading indicator
              }
            }

            // Add the tool call even if arguments are incomplete
            messageContent.push(
              new ToolUseMessageContent(toolCall.id, toolCall.name, parsedArgs),
            );
          }
        });

        // Update the same assistant message with new content
        assistantMessage.content = messageContent;

        yield assistantMessage;
      }
    }
  }

  /**
   * Builds final message content from accumulated streaming data and saves it to the database.
   * Returns the saved message ID, or null if no content was saved.
   */
  private async saveAssistantMessageWithAccumulatedContent(
    threadId: UUID,
    accumulatedText: string,
    accumulatedThinking: string,
    accumulatedToolCalls: Map<
      number,
      {
        id: string | null;
        name: string | null;
        arguments: string;
      }
    >,
    assistantMessage: AssistantMessage,
    streamCompletedSuccessfully: boolean,
  ): Promise<UUID | null> {
    this.logger.log(
      'Finalizing streaming inference, saving accumulated message',
      {
        threadId,
        hasText: accumulatedText.length > 0,
        hasThinking: accumulatedThinking.length > 0,
        toolCallsCount: accumulatedToolCalls.size,
      },
    );

    // Build final message content from accumulated data
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

    // Add tool calls only if streaming completed successfully
    // If interrupted, we exclude tool calls as they represent incomplete actions
    if (streamCompletedSuccessfully) {
      accumulatedToolCalls.forEach((toolCall) => {
        if (toolCall.id && toolCall.name) {
          try {
            const parsedArgs = safeJsonParse(toolCall.arguments, {}) as object;
            if (parsedArgs) {
              finalMessageContent.push(
                new ToolUseMessageContent(
                  toolCall.id,
                  toolCall.name,
                  parsedArgs,
                ),
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
    } else {
      this.logger.log(
        'Streaming was interrupted, excluding tool calls from saved message',
        {
          threadId,
          toolCallCount: accumulatedToolCalls.size,
        },
      );
    }

    // Update the assistant message with final complete content
    assistantMessage.content = finalMessageContent;

    // Save the assistant message to database (preserving the consistent ID)
    // This will save even partial messages if the stream was interrupted
    if (finalMessageContent.length > 0) {
      const savedMessage = await this.saveAssistantMessageUseCase.execute(
        new SaveAssistantMessageCommand(assistantMessage),
      );
      this.logger.log('Successfully saved message to database', {
        threadId,
        messageId: savedMessage.id,
      });
      return savedMessage.id;
    } else {
      this.logger.warn('No content to save for assistant message', {
        threadId,
      });
      return null;
    }
  }

  /**
   * Ensures the thread ends with an assistant message by deleting any trailing messages
   * that come after the specified saved assistant message. This is critical when the stream
   * is interrupted - we need to delete any trailing non-assistant messages (like tool results)
   * to maintain conversation integrity.
   */
  private async cleanupTrailingNonAssistantMessages(
    threadId: UUID,
    savedMessageId: UUID | null,
  ): Promise<void> {
    try {
      // Re-fetch the thread to get the latest message state after save
      const updatedThread = await this.findThreadUseCase.execute(
        new FindThreadQuery(threadId),
      );

      const threadMessages = updatedThread.messages;
      if (threadMessages.length === 0) {
        this.logger.warn('Thread has no messages after save', { threadId });
        return;
      }

      // If we saved a message, find it and delete everything after it
      if (savedMessageId) {
        const savedMessageIndex = threadMessages.findIndex(
          (m) => m.id === savedMessageId,
        );

        if (savedMessageIndex === -1) {
          this.logger.warn('Saved assistant message not found in thread', {
            threadId,
            assistantMessageId: savedMessageId,
          });
          // Fallback: cleanup trailing non-assistant messages
          await this.deleteMessagesUntilAssistant(threadId, threadMessages);
          return;
        }

        // Check if there are any messages after the assistant message we just saved
        const messagesAfterAssistant = threadMessages.slice(
          savedMessageIndex + 1,
        );

        if (messagesAfterAssistant.length === 0) {
          this.logger.debug('Thread correctly ends with assistant message', {
            threadId,
            lastMessageId: savedMessageId,
          });
        } else {
          // Delete all messages that come after the assistant message we just saved
          this.logger.log(
            'Found messages after saved assistant message, cleaning up',
            {
              threadId,
              assistantMessageId: savedMessageId,
              messagesAfterCount: messagesAfterAssistant.length,
            },
          );

          await this.deleteTrailingMessages(threadId, messagesAfterAssistant);
        }
      } else {
        // No message was saved (empty content), cleanup trailing non-assistant messages
        await this.deleteMessagesUntilAssistant(threadId, threadMessages);
      }
    } catch (error) {
      this.logger.error('Error during message cleanup', {
        threadId,
        error: error as Error,
      });
      // Don't throw - we want to gracefully handle cleanup failures
    }
  }

  /**
   * Helper method to delete messages from the end of the thread until an assistant message is found.
   */
  private async deleteMessagesUntilAssistant(
    threadId: UUID,
    threadMessages: Message[],
  ): Promise<void> {
    const lastMessage = threadMessages[threadMessages.length - 1];
    if (lastMessage.role !== MessageRole.ASSISTANT) {
      const messagesToDelete: Message[] = [];
      for (let i = threadMessages.length - 1; i >= 0; i--) {
        const message = threadMessages[i];
        if (message.role === MessageRole.ASSISTANT) {
          break;
        }
        messagesToDelete.push(message);
      }
      await this.deleteTrailingMessages(threadId, messagesToDelete);
    }
  }

  private async deleteTrailingMessages(
    threadId: UUID,
    messages: Message[],
  ): Promise<void> {
    if (messages.length === 0) return;

    this.logger.log('Deleting trailing messages', {
      threadId,
      count: messages.length,
      messageIds: messages.map((m) => m.id),
    });

    for (const message of messages) {
      try {
        await this.deleteMessageUseCase.execute(
          new DeleteMessageCommand(message.id),
        );
        this.logger.debug('Deleted trailing message', {
          messageId: message.id,
          role: message.role,
        });
      } catch (error) {
        this.logger.error('Failed to delete trailing message', {
          messageId: message.id,
          role: message.role,
          error: error as Error,
        });
        // Continue with cleanup even if one deletion fails
      }
    }

    this.logger.log('Successfully cleaned up trailing messages', {
      threadId,
      deletedCount: messages.length,
    });
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
}
