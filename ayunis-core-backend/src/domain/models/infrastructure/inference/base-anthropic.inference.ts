import { Logger } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import type {
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { InferenceHandler } from '../../application/ports/inference.handler';
import type { MessageCreateParamsNonStreaming } from '@anthropic-ai/sdk/resources/messages';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { AnthropicMessageConverter } from '../converters/anthropic-message.converter';

// Type for Anthropic-compatible clients (Anthropic SDK and Bedrock SDK)
type AnthropicCompatibleClient = {
  messages: {
    create: Anthropic['messages']['create'];
  };
};

export abstract class BaseAnthropicInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(BaseAnthropicInferenceHandler.name);
  protected client: AnthropicCompatibleClient;
  protected readonly converter: AnthropicMessageConverter;

  constructor(protected readonly imageContentService: ImageContentService) {
    super();
    this.converter = new AnthropicMessageConverter(imageContentService);
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools.length,
      toolChoice: input.toolChoice,
    });
    try {
      const { messages, tools, toolChoice, systemPrompt, orgId } = input;
      const anthropicTools = tools.map((t) => this.converter.convertTool(t));
      const anthropicMessages = await this.converter.convertMessages(
        messages,
        orgId,
      );
      const anthropicToolChoice = toolChoice
        ? this.converter.convertToolChoice(toolChoice)
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

  protected parseCompletion = (
    response: Anthropic.Messages.Message,
  ): InferenceResponse => {
    this.logger.debug('parseCompletion', response);
    if (!['tool_use', 'end_turn'].includes(response.stop_reason ?? '')) {
      throw new InferenceFailedError(
        `Unexpected stop reason: ${response.stop_reason}`,
        { source: 'anthropic' },
      );
    }
    return {
      content: response.content.map((c) => this.parseContentBlock(c)),
      meta: this.buildAnthropicUsageMeta(response.usage),
    };
  };

  private parseContentBlock(
    c: Anthropic.Messages.ContentBlock,
  ): TextMessageContent | ToolUseMessageContent | ThinkingMessageContent {
    if (c.type === 'thinking')
      return new ThinkingMessageContent(c.thinking, null, c.signature);
    if (c.type === 'tool_use') return this.parseToolCall(c);
    if (c.type === 'text') return new TextMessageContent(c.text);
    throw new InferenceFailedError(`Invalid response content type: ${c.type}`, {
      source: 'anthropic',
    });
  }

  private buildAnthropicUsageMeta(
    usage: Anthropic.Messages.Usage,
  ): InferenceResponse['meta'] {
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
    };
  }

  protected parseToolCall = (
    toolCall: Anthropic.Messages.ToolUseBlock,
  ): ToolUseMessageContent => {
    const id = toolCall.id;
    const name = toolCall.name;
    const parameters = toolCall.input as Record<string, unknown>;
    return new ToolUseMessageContent(id, name, parameters);
  };
}
