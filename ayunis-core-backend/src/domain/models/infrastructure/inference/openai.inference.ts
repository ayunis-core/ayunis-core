import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { OpenAIResponsesMessageConverter } from '../converters/openai-responses-message.converter';

@Injectable()
export class OpenAIInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(OpenAIInferenceHandler.name);
  private readonly client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly converter: OpenAIResponsesMessageConverter,
  ) {
    super();
    this.client = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools.length,
      toolChoice: input.toolChoice,
    });
    try {
      const { messages, tools, toolChoice, orgId } = input;
      const openAiTools = tools.map((t) => this.converter.convertTool(t));
      const openAiMessages = await this.converter.convertMessages(
        messages,
        orgId,
      );
      const isGpt5 = input.model.name.startsWith('gpt-5');

      const completionOptions: OpenAI.Responses.ResponseCreateParamsNonStreaming =
        {
          instructions: input.systemPrompt,
          input: openAiMessages,
          reasoning: isGpt5 ? { effort: 'low' } : undefined,
          model: input.model.name,
          stream: false,
          store: false,
          tools: openAiTools,
          tool_choice: toolChoice
            ? this.converter.convertToolChoice(toolChoice)
            : undefined,
        };
      this.logger.debug('completionOptions', completionOptions);
      const completionFn = () =>
        this.client.responses.create(completionOptions);

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

  private parseCompletion = (
    response: OpenAI.Responses.Response,
  ): InferenceResponse => {
    const completion = response.output;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- output can be empty at runtime
    if (!completion) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'openai',
      });
    }

    const content = completion.flatMap((item) =>
      this.parseCompletionItem(item),
    );
    return {
      content,
      meta: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    };
  };

  private parseCompletionItem(
    item: OpenAI.Responses.ResponseOutputItem,
  ): Array<
    TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
  > {
    if (item.type === 'reasoning') {
      return this.parseReasoningItem(item);
    }
    if (item.type === 'message') {
      return item.content
        .filter((c) => c.type === 'output_text')
        .map((c) => new TextMessageContent(c.text));
    }
    if (item.type === 'function_call') {
      return [this.parseToolCall(item)];
    }
    return [];
  }

  private parseReasoningItem(
    item: OpenAI.Responses.ResponseOutputItem,
  ): ThinkingMessageContent[] {
    const reasoningItem = item as unknown as {
      type: 'reasoning';
      id?: string;
      encrypted_content?: string;
      summary?: Array<{ type: string; text: string }>;
    };
    const summaryText =
      reasoningItem.summary
        ?.filter((s) => s.type === 'summary_text')
        .map((s) => s.text)
        .join('') ?? '';
    if (!summaryText) return [];
    return [
      new ThinkingMessageContent(
        summaryText,
        reasoningItem.id ?? null,
        reasoningItem.encrypted_content ?? null,
      ),
    ];
  }

  private parseToolCall(
    toolCall: OpenAI.Responses.ResponseFunctionToolCall,
  ): ToolUseMessageContent {
    const id = toolCall.call_id;
    const name = toolCall.name;
    const parameters = JSON.parse(toolCall.arguments) as Record<
      string,
      unknown
    >;
    return new ToolUseMessageContent(id, name, parameters);
  }
}
