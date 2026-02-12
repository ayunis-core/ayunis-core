import { Injectable, Logger } from '@nestjs/common';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
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
import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import { randomUUID } from 'crypto';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';

@Injectable()
export class BaseOllamaStreamInferenceHandler
  implements StreamInferenceHandler
{
  private readonly logger = new Logger(BaseOllamaStreamInferenceHandler.name);
  private readonly thinkingParser = new ThinkingContentParser();
  protected client: Ollama;
  protected imageContentService?: ImageContentService;

  // constructor(private readonly configService: ConfigService) {
  //   this.client = new Ollama({
  //     host: this.configService.get('models.ollama.baseURL'),
  //   });
  // }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      void this.streamResponse(input, subscriber);
    });
  }

  private streamResponse = async (
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> => {
    try {
      this.thinkingParser.reset();
      const completionOptions = await this.buildCompletionOptions(input);
      this.logger.debug('completionOptions', completionOptions);

      const completionFn = () => this.client.chat(completionOptions);
      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      for await (const chunk of response) {
        const delta = this.convertChunk(chunk);
        const hasContent =
          delta.textContentDelta ||
          delta.thinkingDelta ||
          delta.toolCallsDelta.length > 0 ||
          delta.usage;
        if (hasContent) subscriber.next(delta);
        if (delta.finishReason) break;
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  };

  private buildCompletionOptions = async (
    input: StreamInferenceInput,
  ): Promise<ChatRequest & { stream: true }> => {
    const { messages, tools, orgId } = input;
    const ollamaTools = tools?.map(this.convertTool).map((tool) => ({
      ...tool,
      function: { ...tool.function, strict: true },
    }));
    const ollamaMessages = await this.convertMessages(messages, orgId);
    const systemPrompt = input.systemPrompt
      ? this.convertSystemPrompt(input.systemPrompt)
      : undefined;

    return {
      model: input.model.name,
      messages: systemPrompt
        ? [systemPrompt, ...ollamaMessages]
        : ollamaMessages,
      tools: ollamaTools.length > 0 ? ollamaTools : undefined,
      stream: true as const,
      options: { num_ctx: 30000 },
    };
  };

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

  private convertMessages = async (
    messages: Message[],
    orgId: string,
  ): Promise<OllamaMessage[]> => {
    const convertedMessages: OllamaMessage[] = [];
    for (const message of messages) {
      convertedMessages.push(...(await this.convertMessage(message, orgId)));
    }
    return convertedMessages;
  };

  private convertMessage = async (
    message: Message,
    orgId: string,
  ): Promise<OllamaMessage[]> => {
    if (message.role === MessageRole.USER) {
      return this.convertUserMessage(message, orgId);
    }
    if (message.role === MessageRole.ASSISTANT) {
      return [this.convertAssistantMessage(message)];
    }
    if (message.role === MessageRole.SYSTEM) {
      return this.convertSystemMessage(message);
    }
    if (message.role === MessageRole.TOOL) {
      return this.convertToolMessage(message);
    }
    return [];
  };

  private convertUserMessage = async (
    message: Message,
    orgId: string,
  ): Promise<OllamaMessage[]> => {
    const textParts: string[] = [];
    const images: string[] = [];

    for (const content of message.content) {
      if (content instanceof TextMessageContent) {
        textParts.push(content.text);
      }
      if (content instanceof ImageMessageContent) {
        if (!this.imageContentService) {
          throw new InferenceFailedError(
            'Image converter not configured for image support',
            { source: 'ollama' },
          );
        }
        const imageData = await this.convertImageContent(content, {
          orgId,
          threadId: message.threadId,
          messageId: message.id,
        });
        images.push(imageData);
      }
    }

    if (textParts.length === 0 && images.length === 0) return [];
    return [
      {
        role: 'user' as const,
        content: textParts.join('\n') || '',
        images: images.length > 0 ? images : undefined,
      },
    ];
  };

  private convertAssistantMessage = (message: Message): OllamaMessage => {
    let text: string | undefined;
    let thinking: string | undefined;
    const toolCalls: OllamaToolCall[] = [];

    for (const content of message.content) {
      if (content instanceof TextMessageContent) text = content.text;
      if (content instanceof ThinkingMessageContent)
        thinking = content.thinking;
      if (content instanceof ToolUseMessageContent) {
        toolCalls.push({
          function: { name: content.name, arguments: content.params },
        });
      }
    }

    return {
      role: 'assistant' as const,
      content: text ?? '',
      thinking,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  };

  private convertSystemMessage = (message: Message): OllamaMessage[] =>
    message.content
      .filter((c): c is TextMessageContent => c instanceof TextMessageContent)
      .map((c) => ({ role: 'system' as const, content: c.text }));

  private convertToolMessage = (message: Message): OllamaMessage[] =>
    message.content
      .filter(
        (c): c is ToolResultMessageContent =>
          c instanceof ToolResultMessageContent,
      )
      .map((c) => ({ role: 'tool' as const, content: c.result }));

  private convertChunk = (
    chunk: ChatResponse,
  ): StreamInferenceResponseChunk => {
    const delta = chunk.message;
    const { thinkingDelta, textContentDelta } = this.parseChunkContent(delta);
    const thinkingContent = delta.thinking ?? null;

    return new StreamInferenceResponseChunk({
      thinkingDelta: thinkingContent ?? thinkingDelta,
      textContentDelta,
      toolCallsDelta: this.convertToolCalls(delta.tool_calls),
      finishReason: chunk.done ? chunk.done_reason : null,
      usage: this.extractChunkUsage(chunk),
    });
  };

  private parseChunkContent = (
    delta: ChatResponse['message'],
  ): { thinkingDelta: string | null; textContentDelta: string | null } => {
    const textContent = delta.content ?? null;
    return textContent
      ? this.thinkingParser.parse(textContent)
      : { thinkingDelta: null, textContentDelta: null };
  };

  private convertToolCalls = (
    toolCalls: OllamaToolCall[] | undefined,
  ): StreamInferenceResponseChunkToolCall[] =>
    toolCalls?.map(
      (toolCall) =>
        new StreamInferenceResponseChunkToolCall({
          index: 0,
          id: randomUUID(),
          name: toolCall.function?.name,
          argumentsDelta: JSON.stringify(toolCall.function?.arguments),
        }),
    ) ?? [];

  private extractChunkUsage = (chunk: ChatResponse) => {
    if (!chunk.done) return undefined;
    const hasUsage =
      chunk.prompt_eval_count !== undefined || chunk.eval_count !== undefined;
    if (!hasUsage) return undefined;
    return {
      inputTokens: chunk.prompt_eval_count,
      outputTokens: chunk.eval_count,
    };
  };

  private async convertImageContent(
    content: ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<string> {
    if (!this.imageContentService) {
      throw new InferenceFailedError(
        'Image converter not configured for image support',
        {
          source: 'ollama',
        },
      );
    }

    const imageData = await this.imageContentService.convertImageToBase64(
      content,
      context,
    );

    return imageData.base64;
  }
}
