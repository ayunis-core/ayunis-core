import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import {
  Ollama,
  ChatRequest,
  ToolCall as OllamaToolCall,
  ChatResponse,
} from 'ollama';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import { InferenceFailedError } from '../../application/models.errors';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { OllamaMessageConverter } from '../converters/ollama-message.converter';

@Injectable()
export abstract class BaseOllamaInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(BaseOllamaInferenceHandler.name);
  private readonly thinkingParser = new ThinkingContentParser();
  protected client: Ollama;
  protected imageContentService?: ImageContentService;
  protected converter: OllamaMessageConverter;

  protected initConverter(): void {
    this.converter = new OllamaMessageConverter(this.imageContentService);
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools.length,
    });
    try {
      const { messages, tools, orgId } = input;
      const ollamaTools = tools
        .map((t) => this.converter.convertTool(t))
        .map((tool) => ({
          ...tool,
          function: { ...tool.function, strict: true },
        }));
      const ollamaMessages = await this.converter.convertMessages(
        messages,
        orgId,
      );
      const systemPrompt = input.systemPrompt
        ? this.converter.convertSystemPrompt(input.systemPrompt)
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

  private parseCompletion = (response: ChatResponse): InferenceResponse => {
    const completion = response.message;

    const content = [
      ...this.parseOllamaContent(completion),
      ...(completion.tool_calls ?? []).map((tc) => this.parseToolCall(tc)),
    ];
    return {
      content,
      meta: {
        inputTokens: response.prompt_eval_count,
        outputTokens: response.eval_count,
        totalTokens: response.prompt_eval_count + response.eval_count,
      },
    };
  };

  private parseOllamaContent(
    completion: ChatResponse['message'],
  ): Array<TextMessageContent | ThinkingMessageContent> {
    if (!completion.content) return [];
    this.thinkingParser.reset();
    const parseResult = this.thinkingParser.parse(completion.content);
    const result: Array<TextMessageContent | ThinkingMessageContent> = [];
    if (completion.thinking) {
      result.push(new ThinkingMessageContent(completion.thinking));
    } else if (parseResult.thinkingDelta) {
      result.push(new ThinkingMessageContent(parseResult.thinkingDelta));
    }
    if (parseResult.textContentDelta) {
      result.push(new TextMessageContent(parseResult.textContentDelta));
    }
    return result;
  }

  private parseToolCall(toolCall: OllamaToolCall): ToolUseMessageContent {
    const id = `ollama-tool-${Date.now()}-${crypto.randomUUID()}`;
    const name = toolCall.function.name;
    const parameters = toolCall.function.arguments as Record<string, unknown>;

    if (!name) {
      throw new InferenceFailedError('Tool call missing function name', {
        source: 'ollama',
      });
    }

    return new ToolUseMessageContent(id, name, parameters);
  }
}
