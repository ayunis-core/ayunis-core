import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Logger, Injectable } from '@nestjs/common';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { GoogleGenAI } from '@google/genai';
import type {
  Content,
  Part,
  FunctionDeclaration,
  GenerateContentConfig,
  GenerateContentResponse,
  FunctionCallingConfig,
} from '@google/genai';
import { FunctionCallingConfigMode } from '@google/genai';

/**
 * Extends the SDK's Part type with `thoughtSignature`, which Gemini returns
 * on thinking-model responses but isn't yet in the official type definitions.
 */
interface GeminiPart extends Part {
  thoughtSignature?: string;
}

@Injectable()
export class GeminiStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(GeminiStreamInferenceHandler.name);
  private readonly client: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('models.gemini.apiKey'),
    });
  }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      void this.streamResponse(input, subscriber);
    });
  }

  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> {
    try {
      const { messages, tools, toolChoice, orgId } = input;
      const contents = await this.convertMessages(messages, orgId);

      const geminiTools = tools?.length
        ? [{ functionDeclarations: tools.map(this.convertTool) }]
        : undefined;

      const config: GenerateContentConfig = {
        systemInstruction: input.systemPrompt
          ? { role: 'user', parts: [{ text: input.systemPrompt }] }
          : undefined,
        tools: geminiTools,
        toolConfig:
          toolChoice && tools?.length
            ? { functionCallingConfig: this.convertToolChoice(toolChoice) }
            : undefined,
      };

      this.logger.debug('generateContentStream config', { config });

      const completionFn = () =>
        this.client.models.generateContentStream({
          model: input.model.name,
          contents,
          config,
        });

      const stream = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      for await (const chunk of stream) {
        const deltas = this.convertChunk(chunk);
        for (const delta of deltas) {
          subscriber.next(delta);
        }
      }

      subscriber.complete();
    } catch (error) {
      this.logger.error('Gemini streaming inference failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as Record<string, unknown>)?.status,
        contents: JSON.stringify(error).substring(0, 2000),
      });
      subscriber.error(error);
    }
  }

  private convertTool = (tool: Tool): FunctionDeclaration => {
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as FunctionDeclaration['parameters'],
    };
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ): FunctionCallingConfig => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { mode: FunctionCallingConfigMode.AUTO };
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return { mode: FunctionCallingConfigMode.ANY };
    } else {
      return {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: [toolChoice],
      };
    }
  };

  private convertMessages = async (
    messages: Message[],
    orgId: string,
  ): Promise<Content[]> => {
    const contents: Content[] = [];

    for (const message of messages) {
      const content = await this.convertMessage(message, orgId);
      if (content) {
        contents.push(content);
      }
    }

    return contents;
  };

  private convertMessage = async (
    message: Message,
    orgId: string,
  ): Promise<Content | null> => {
    if (message instanceof UserMessage) {
      const parts: Part[] = [];
      for (const content of message.content) {
        if (content instanceof TextMessageContent) {
          parts.push({ text: content.text });
        }
        if (content instanceof ImageMessageContent) {
          const imageData = await this.imageContentService.convertImageToBase64(
            content,
            {
              orgId,
              threadId: message.threadId,
              messageId: message.id,
            },
          );
          parts.push({
            inlineData: {
              mimeType: imageData.contentType,
              data: imageData.base64,
            },
          });
        }
      }
      return { role: 'user', parts };
    }

    if (message instanceof AssistantMessage) {
      const parts: Part[] = [];
      for (const content of message.content) {
        if (content instanceof TextMessageContent) {
          const textPart: GeminiPart = { text: content.text };
          if (content.providerMetadata?.gemini?.thoughtSignature) {
            textPart.thoughtSignature =
              content.providerMetadata.gemini.thoughtSignature;
          }
          parts.push(textPart);
        }
        if (content instanceof ToolUseMessageContent) {
          const fcPart: GeminiPart = {
            functionCall: {
              id: content.id,
              name: content.name,
              args: content.params as Record<string, unknown>,
            },
          };
          if (content.providerMetadata?.gemini?.thoughtSignature) {
            fcPart.thoughtSignature =
              content.providerMetadata.gemini.thoughtSignature;
          }
          parts.push(fcPart);
        }
      }
      return { role: 'model', parts };
    }

    if (message instanceof ToolResultMessage) {
      const parts: Part[] = [];
      for (const content of message.content) {
        parts.push({
          functionResponse: {
            id: content.toolId,
            name: content.toolName,
            response: { result: content.result },
          },
        });
      }
      return { role: 'user', parts };
    }

    if (message instanceof SystemMessage) {
      return {
        role: 'user',
        parts: message.content.map((content) => ({
          text: content.text,
        })),
      };
    }

    this.logger.warn('Unknown message type', message);
    return null;
  };

  private convertChunk = (
    chunk: GenerateContentResponse,
  ): StreamInferenceResponseChunk[] => {
    const results: StreamInferenceResponseChunk[] = [];
    const candidate = chunk.candidates?.[0];

    if (candidate?.content?.parts) {
      for (const [index, part] of candidate.content.parts.entries()) {
        const thoughtSignature = (part as GeminiPart).thoughtSignature;

        if (part.text) {
          results.push(
            new StreamInferenceResponseChunk({
              thinkingDelta: null,
              textContentDelta: part.text,
              textProviderMetadata: thoughtSignature
                ? { gemini: { thoughtSignature } }
                : null,
              toolCallsDelta: [],
            }),
          );
        }

        if (part.functionCall) {
          results.push(
            new StreamInferenceResponseChunk({
              thinkingDelta: null,
              textContentDelta: null,
              toolCallsDelta: [
                new StreamInferenceResponseChunkToolCall({
                  index,
                  id: part.functionCall.id ?? part.functionCall.name ?? null,
                  name: part.functionCall.name ?? null,
                  argumentsDelta: part.functionCall.args
                    ? JSON.stringify(part.functionCall.args)
                    : null,
                  providerMetadata: thoughtSignature
                    ? { gemini: { thoughtSignature } }
                    : null,
                }),
              ],
            }),
          );
        }
      }
    }

    const usage = chunk.usageMetadata;
    if (usage) {
      results.push(
        new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [],
          usage: {
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
          },
        }),
      );
    }

    return results;
  };
}
