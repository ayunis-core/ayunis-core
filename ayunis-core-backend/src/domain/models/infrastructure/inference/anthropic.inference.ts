import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { ConfigService } from '@nestjs/config';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import {
  MessageCreateParamsNonStreaming,
  ToolChoiceAny,
  ToolChoiceAuto,
  ToolChoiceTool,
} from '@anthropic-ai/sdk/resources/messages';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';

type AnthropicToolChoice = ToolChoiceAny | ToolChoiceAuto | ToolChoiceTool;

@Injectable()
export class AnthropicInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(AnthropicInferenceHandler.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Anthropic({
      apiKey: this.configService.get('anthropic.apiKey'),
    });
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', input);
    try {
      const { messages, tools, toolChoice, systemPrompt } = input;
      const anthropicTools = tools?.map(this.convertTool);
      const anthropicMessages = this.convertMessages(messages);
      const anthropicToolChoice = toolChoice
        ? this.convertToolChoice(toolChoice)
        : undefined;

      const completionOptions: MessageCreateParamsNonStreaming = {
        model: input.model.name,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools,
        tool_choice: anthropicToolChoice,
        max_tokens: 1000,
        stream: false,
      };

      this.logger.debug('completionOptions', completionOptions);

      const completionFn = () => this.client.messages.create(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      const modelResponse = this.parseCompletion(response);
      return modelResponse;
    } catch (error) {
      this.logger.error('Failed to get response from Anthropic', error);
      if (error instanceof InferenceFailedError) {
        throw error;
      }
      throw new InferenceFailedError('Anthropic inference failed', {
        source: 'anthropic',
        originalError:
          error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  }

  private convertTool = (tool: Tool): Anthropic.Tool => {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Messages.Tool.InputSchema,
    };
  };

  private convertMessages = (messages: Message[]): Anthropic.MessageParam[] => {
    const chatMessages = messages.reduce((convertedMessages, message) => {
      // always push the first message and next loop
      if (convertedMessages.length === 0) {
        convertedMessages.push(this.convertMessage(message));
        return convertedMessages;
      }
      const lastMessage = convertedMessages.pop();
      if (!lastMessage) {
        throw new Error('lastMessage is undefined');
      }
      // assistant messages are always separate so
      // an assistant message is always pushed
      // and the following message is always pushed
      if (
        message.role === MessageRole.ASSISTANT ||
        lastMessage.role === MessageRole.ASSISTANT
      ) {
        convertedMessages.push(lastMessage);
        convertedMessages.push(this.convertMessage(message));
        return convertedMessages;
      }

      // all other messages are combined as one user message
      // so assistant and user messages always follow each other
      // user -> assistant -> user -> assistant
      const convertedMessage = this.convertMessage(message);

      const convertedMessageContent =
        typeof convertedMessage.content === 'string'
          ? [{ type: 'text' as const, text: convertedMessage.content }]
          : convertedMessage.content;

      const lastMessageContent =
        typeof lastMessage.content === 'string'
          ? [{ type: 'text' as const, text: lastMessage.content }]
          : lastMessage.content;

      const allContent = [...lastMessageContent, ...convertedMessageContent];
      convertedMessages.push({ role: 'user', content: allContent });
      return convertedMessages;
    }, [] as Anthropic.MessageParam[]);
    return chatMessages;
  };

  // Map messages to Anthropic.MessageParam
  private convertMessage = (message: Message): Anthropic.MessageParam => {
    if (message instanceof UserMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => {
          return {
            type: 'text',
            text: content.text,
          };
        }),
      };
    }
    if (message instanceof AssistantMessage) {
      return {
        role: 'assistant',
        content: message.content.map((content) => {
          if (content instanceof TextMessageContent) {
            return {
              type: 'text',
              text: content.text,
            };
          }
          if (content instanceof ToolUseMessageContent) {
            return {
              type: 'tool_use',
              id: content.id,
              name: content.name,
              input: content.params,
            };
          }
          throw new Error(`Unknown message content type`);
        }),
      };
    }
    if (message instanceof ToolResultMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => {
          return {
            type: 'tool_result',
            tool_use_id: content.toolId,
            content: content.result,
          };
        }),
      };
    }
    if (message instanceof SystemMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => {
          return {
            type: 'text',
            text: content.text,
          };
        }),
      };
    }
    throw new Error(`Unknown message type`);
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ): AnthropicToolChoice => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { type: 'auto' };
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      throw new Error("Tool choice 'required' is not supported in Anthropic");
    } else {
      return { type: 'tool', name: toolChoice };
    }
  };

  private parseCompletion = (
    response: Anthropic.Messages.Message,
  ): InferenceResponse => {
    this.logger.debug('parseCompletion', response);

    if (!response) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'anthropic',
      });
    }

    if (!['tool_use', 'end_turn'].includes(response.stop_reason || '')) {
      throw new InferenceFailedError(
        `Unexpected stop reason: ${response.stop_reason}`,
        {
          source: 'anthropic',
        },
      );
    }

    const modelResponseContent = response.content.map((c) => {
      if (c.type === 'tool_use') {
        return this.parseToolCall(c);
      } else if (c.type === 'text') {
        return new TextMessageContent(c.text);
      } else {
        throw new InferenceFailedError(
          `Invalid response content type: ${c.type}`,
          {
            source: 'anthropic',
          },
        );
      }
    });

    const modelResponse: InferenceResponse = {
      content: modelResponseContent,
      meta: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    return modelResponse;
  };

  private parseToolCall = (
    toolCall: Anthropic.Messages.ToolUseBlock,
  ): ToolUseMessageContent => {
    const id = toolCall.id;
    const name = toolCall.name;
    const parameters = toolCall.input as object;
    return new ToolUseMessageContent(id, name, parameters);
  };
}
