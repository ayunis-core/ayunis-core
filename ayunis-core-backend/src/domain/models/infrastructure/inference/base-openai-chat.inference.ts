import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import OpenAI from 'openai';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { InferenceFailedError } from '../../application/models.errors';
import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import { OpenAIChatMessageConverter } from '../converters/openai-chat-message.converter';

@Injectable()
export abstract class BaseOpenAIChatInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(BaseOpenAIChatInferenceHandler.name);
  private readonly thinkingParser = new ThinkingContentParser();
  protected client: OpenAI;
  protected readonly chatConverter = new OpenAIChatMessageConverter();

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools.length,
      toolChoice: input.toolChoice,
    });
    try {
      const { messages, tools, toolChoice } = input;
      const openAiTools = tools
        .map((t) => this.chatConverter.convertTool(t))
        .map((tool) => ({
          ...tool,
          function: { ...tool.function, strict: true },
        }));
      const openAiMessages = this.chatConverter.convertMessages(messages);
      const systemPrompt = input.systemPrompt
        ? this.chatConverter.convertSystemPrompt(input.systemPrompt)
        : undefined;
      const completionOptions = {
        model: input.model.name,
        messages: systemPrompt
          ? [systemPrompt, ...openAiMessages]
          : openAiMessages,
        tools: openAiTools,
        tool_choice: toolChoice
          ? this.chatConverter.convertToolChoice(toolChoice)
          : undefined,
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

  private parseCompletion(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): InferenceResponse {
    const completion = response.choices[0]?.message;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- choices can be empty at runtime
    if (!completion) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'openai',
      });
    }

    const content = [
      ...this.parseChatContent(completion.content),
      ...(completion.tool_calls ?? []).map((tc) => this.parseToolCall(tc)),
    ];
    return {
      content,
      meta: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    };
  }

  private parseChatContent(
    content: string | null,
  ): Array<TextMessageContent | ThinkingMessageContent> {
    if (!content) return [];
    this.thinkingParser.reset();
    const result = this.thinkingParser.parse(content);
    const items: Array<TextMessageContent | ThinkingMessageContent> = [];
    if (result.thinkingDelta)
      items.push(new ThinkingMessageContent(result.thinkingDelta));
    if (result.textContentDelta)
      items.push(new TextMessageContent(result.textContentDelta));
    return items;
  }

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
