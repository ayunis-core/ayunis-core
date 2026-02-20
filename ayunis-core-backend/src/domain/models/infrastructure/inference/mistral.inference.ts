import { Logger, Injectable } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceResponse,
  InferenceInput as HandlerInferenceInput,
} from '../../application/ports/inference.handler';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import {
  ToolCall as MistralToolCall,
  ChatCompletionResponse,
} from '@mistralai/mistralai/models/components';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { MistralMessageConverter } from '../converters/mistral-message.converter';

@Injectable()
export class MistralInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(MistralInferenceHandler.name);
  private readonly client: Mistral;
  private readonly converter: MistralMessageConverter;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('mistral.apiKey'),
    });
    this.converter = new MistralMessageConverter(imageContentService);
  }

  async answer(input: HandlerInferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools.length,
      toolChoice: input.toolChoice,
    });
    const { model, messages, tools, toolChoice, orgId } = input;
    const mistralTools = tools.map((t) => this.converter.convertTool(t));
    const mistralMessages = await this.converter.convertMessages(
      messages,
      orgId,
    );
    const systemPrompt = input.systemPrompt
      ? this.converter.convertSystemPrompt(input.systemPrompt)
      : undefined;
    const mistralToolChoice = toolChoice
      ? this.converter.convertToolChoice(toolChoice)
      : undefined;

    const completionFn = () =>
      this.client.chat.complete({
        model: model.name,
        messages: systemPrompt
          ? [systemPrompt, ...mistralMessages]
          : mistralMessages,
        tools: mistralTools,
        toolChoice: mistralToolChoice,
        maxTokens: 1000,
      });

    const response = await retryWithBackoff({
      fn: completionFn,
      maxRetries: 3,
      delay: 1000,
    });

    const modelResponse = this.parseCompletion(response);
    return modelResponse;
  }

  private parseCompletion = (
    response: ChatCompletionResponse,
  ): InferenceResponse => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- choices can be empty at runtime
    const completion = response.choices?.[0]?.message;
    const modelResponseContent: Array<
      TextMessageContent | ToolUseMessageContent
    > = [];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for missing completion
    if (!completion) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'mistral',
      });
    }

    if (completion.content) {
      if (Array.isArray(completion.content)) {
        for (const content of completion.content) {
          if (content.type === 'text') {
            modelResponseContent.push(new TextMessageContent(content.text));
          }
        }
      } else {
        modelResponseContent.push(new TextMessageContent(completion.content));
      }
    }

    for (const tool of completion.toolCalls ?? []) {
      modelResponseContent.push(this.parseToolCall(tool));
    }

    const modelResponse: InferenceResponse = {
      content: modelResponseContent,
      meta: {
        inputTokens: response.usage.promptTokens,
        outputTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
    };

    return modelResponse;
  };

  private parseToolCall = (
    toolCall: MistralToolCall,
  ): ToolUseMessageContent => {
    const id = toolCall.id ?? 'none';
    const name = toolCall.function.name;
    const parameters = toolCall.function.arguments;
    if (typeof parameters === 'string') {
      return new ToolUseMessageContent(
        id,
        name,
        JSON.parse(parameters) as Record<string, unknown>,
      );
    }
    return new ToolUseMessageContent(id, name, parameters);
  };
}
