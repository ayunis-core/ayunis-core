import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import {
  Ollama,
  ChatRequest,
  Tool as OllamaTool,
  Message as OllamaMessage,
  ToolCall as OllamaToolCall,
  ChatResponse,
} from 'ollama';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import { InferenceFailedError } from '../../application/models.errors';

@Injectable()
export abstract class BaseOllamaInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(BaseOllamaInferenceHandler.name);
  private readonly thinkingParser = new ThinkingContentParser();
  protected client: Ollama;

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', input);
    try {
      const { messages, tools } = input;
      const ollamaTools = tools?.map(this.convertTool).map((tool) => ({
        ...tool,
        function: { ...tool.function, strict: true },
      }));
      const ollamaMessages = this.convertMessages(messages);
      const systemPrompt = input.systemPrompt
        ? this.convertSystemPrompt(input.systemPrompt)
        : undefined;
      const completionOptions: ChatRequest & { stream: false } = {
        model: input.model.name,
        messages: systemPrompt
          ? [systemPrompt, ...ollamaMessages]
          : ollamaMessages,
        tools: ollamaTools,
        stream: false,
        options: {
          num_ctx: 30000,
        },
      };
      this.logger.debug('completionOptions', completionOptions);
      const completionFn = () => this.client.chat(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      const modelResponse = this.parseCompletion(response);
      return modelResponse;
    } catch (error) {
      this.logger.error('Failed to get response from Ollama', error);
      if (error instanceof InferenceFailedError) {
        throw error;
      }
      throw new InferenceFailedError('Ollama inference failed', {
        source: 'ollama',
        originalError:
          error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  }

  private convertTool = (tool: Tool): OllamaTool => {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    };
  };

  private convertSystemPrompt = (systemPrompt: string): OllamaMessage => {
    return {
      role: 'system' as const,
      content: systemPrompt,
    };
  };

  private convertMessages = (messages: Message[]): OllamaMessage[] => {
    const convertedMessages: OllamaMessage[] = [];
    for (const message of messages) {
      convertedMessages.push(...this.convertMessage(message));
    }
    return convertedMessages;
  };

  private convertMessage = (message: Message): OllamaMessage[] => {
    const convertedMessages: OllamaMessage[] = [];
    // User Message
    if (message.role === MessageRole.USER) {
      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          convertedMessages.push({
            role: 'user' as const,
            content: content.text,
          });
        }
      }
    }

    if (message.role === MessageRole.ASSISTANT) {
      let assistantTextMessageContent: string | undefined = undefined;
      let assistantToolUseMessageContent: OllamaToolCall[] | undefined =
        undefined;

      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          assistantTextMessageContent = content.text;
        }
        // Tool Use Message Content
        if (content instanceof ToolUseMessageContent) {
          if (!assistantToolUseMessageContent) {
            assistantToolUseMessageContent = [
              {
                function: {
                  name: content.name,
                  arguments: content.params,
                },
              },
            ];
          } else {
            assistantToolUseMessageContent.push({
              function: {
                name: content.name,
                arguments: content.params,
              },
            });
          }
        }
      }
      convertedMessages.push({
        role: 'assistant' as const,
        content: assistantTextMessageContent ?? '',
        tool_calls: assistantToolUseMessageContent,
      });
    }

    if (message.role === MessageRole.SYSTEM) {
      for (const content of message.content) {
        if (content instanceof TextMessageContent) {
          convertedMessages.push({
            role: 'system' as const,
            content: content.text,
          });
        }
      }
    }

    if (message.role === MessageRole.TOOL) {
      for (const content of message.content) {
        if (content instanceof ToolResultMessageContent) {
          convertedMessages.push({
            role: 'tool' as const,
            content: content.result,
          });
        }
      }
    }

    return convertedMessages;
  };

  private parseCompletion = (response: ChatResponse): InferenceResponse => {
    const completion = response.message;

    if (!completion) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'ollama',
      });
    }

    const modelResponseContent: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    > = [];

    if (completion.content) {
      // Reset thinking parser and parse the complete content
      this.thinkingParser.reset();
      const parseResult = this.thinkingParser.parse(completion.content);

      // Add thinking content if present
      if (completion.thinking) {
        modelResponseContent.push(
          new ThinkingMessageContent(completion.thinking),
        );
      } else if (parseResult.thinkingDelta) {
        modelResponseContent.push(
          new ThinkingMessageContent(parseResult.thinkingDelta),
        );
      }

      // Add text content if present
      if (parseResult.textContentDelta) {
        modelResponseContent.push(
          new TextMessageContent(parseResult.textContentDelta),
        );
      }
    }

    for (const tool of completion.tool_calls || []) {
      modelResponseContent.push(this.parseToolCall(tool));
    }

    const modelResponse: InferenceResponse = {
      content: modelResponseContent,
      meta: {
        inputTokens: response.prompt_eval_count,
        outputTokens: response.eval_count,
        totalTokens:
          (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };
    return modelResponse;
  };

  private parseToolCall(toolCall: OllamaToolCall): ToolUseMessageContent {
    const id = `ollama-tool-${Date.now()}-${Math.random()}`;
    const name = toolCall.function?.name;
    const parameters = toolCall.function?.arguments as Record<string, unknown>;

    if (!name) {
      throw new InferenceFailedError('Tool call missing function name', {
        source: 'ollama',
      });
    }

    return new ToolUseMessageContent(id, name, parameters);
  }
}
