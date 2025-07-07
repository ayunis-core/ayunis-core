import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { FunctionParameters } from 'openai/resources/shared';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';

@Injectable()
export class OpenAIInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(OpenAIInferenceHandler.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', input);
    try {
      const { messages, tools, toolChoice } = input;
      const openAiTools = tools?.map(this.convertTool).map((tool) => ({
        ...tool,
        function: { ...tool.function, strict: true },
      }));
      const openAiMessages = this.convertMessages(messages);
      const completionOptions = {
        model: input.model.name,
        messages: openAiMessages,
        tools: openAiTools,
        tool_choice: toolChoice
          ? this.convertToolChoice(toolChoice)
          : undefined,
        max_tokens: 1000,
      };
      this.logger.debug('completionOptions', completionOptions);
      const completionFn = () =>
        this.client.chat.completions.create(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });
      const modelResponse = this.parseCompletion(response);

      return modelResponse;
    } catch (error) {
      this.logger.error('Failed to get response from OpenAI', error);
      if (error instanceof InferenceFailedError) {
        throw error;
      }
      throw new InferenceFailedError('OpenAI inference failed', {
        source: 'openai',
        originalError:
          error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  }

  private convertTool = (tool: Tool): OpenAI.ChatCompletionTool => {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as FunctionParameters | undefined,
      },
    };
  };

  private convertMessages = (
    messages: Message[],
  ): OpenAI.ChatCompletionMessageParam[] => {
    const convertedMessages: OpenAI.ChatCompletionMessageParam[] = [];
    for (const message of messages) {
      convertedMessages.push(...this.convertMessage(message));
    }
    return convertedMessages;
  };

  private convertMessage = (
    message: Message,
  ): OpenAI.ChatCompletionMessageParam[] => {
    const convertedMessages: OpenAI.ChatCompletionMessageParam[] = [];
    // User Message
    if (message.role === MessageRole.USER) {
      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          convertedMessages.push({
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: content.text,
              },
            ],
          });
        }
      }
    }

    if (message.role === MessageRole.ASSISTANT) {
      let assistantTextMessageContent: string | undefined = undefined;
      let assistantToolUseMessageContent:
        | OpenAI.ChatCompletionMessageToolCall[]
        | undefined = undefined;

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
                id: content.id,
                type: 'function',
                function: {
                  name: content.name,
                  arguments: JSON.stringify(content.params),
                },
              },
            ];
          } else {
            assistantToolUseMessageContent.push({
              id: content.id,
              type: 'function',
              function: {
                name: content.name,
                arguments: JSON.stringify(content.params),
              },
            });
          }
        }
      }
      convertedMessages.push({
        role: 'assistant' as const,
        content: assistantTextMessageContent,
        tool_calls: assistantToolUseMessageContent,
      });
    }

    if (message instanceof SystemMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'system' as const,
          content: content.text,
        });
      }
    }

    if (message instanceof ToolResultMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'tool' as const,
          tool_call_id: content.toolId,
          content: content.result,
        });
      }
    }

    return convertedMessages;
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ): OpenAI.ChatCompletionToolChoiceOption => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return 'auto';
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return 'required';
    } else {
      return { type: 'function', function: { name: toolChoice } };
    }
  };

  private parseCompletion = (
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): InferenceResponse => {
    const completion = response.choices[0]?.message;

    if (!completion) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'openai',
      });
    }

    const modelResponseContent: Array<
      TextMessageContent | ToolUseMessageContent
    > = [];

    if (completion.content) {
      modelResponseContent.push(new TextMessageContent(completion.content));
    }

    for (const tool of completion.tool_calls || []) {
      modelResponseContent.push(this.parseToolCall(tool));
    }

    const modelResponse: InferenceResponse = {
      content: modelResponseContent,
      meta: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    };
    return modelResponse;
  };

  private parseToolCall(
    toolCall: OpenAI.ChatCompletionMessageToolCall,
  ): ToolUseMessageContent {
    const id = toolCall.id;
    const name = toolCall.function.name;
    const parameters = JSON.parse(toolCall.function.arguments) as Record<
      string,
      unknown
    >;
    return new ToolUseMessageContent(id, name, parameters);
  }
}
