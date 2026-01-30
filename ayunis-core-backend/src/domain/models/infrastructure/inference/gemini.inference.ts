import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { ConfigService } from '@nestjs/config';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
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
export class GeminiInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(GeminiInferenceHandler.name);
  private readonly client: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    super();
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('models.gemini.apiKey'),
    });
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools?.length ?? 0,
      toolChoice: input.toolChoice,
    });
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

      this.logger.debug('generateContent config', { config });

      const completionFn = () =>
        this.client.models.generateContent({
          model: input.model.name,
          contents,
          config,
        });

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      return this.parseResponse(response);
    } catch (error) {
      this.logger.error('Failed to get response from Gemini', error);
      if (error instanceof InferenceFailedError) {
        throw error;
      }
      throw new InferenceFailedError('Gemini inference failed', {
        source: 'gemini',
        originalError:
          error instanceof Error ? error : new Error('Unknown error'),
      });
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
        // Skip thinking content - Gemini doesn't support sending thinking blocks
        // back in conversation history. Gemini's native thinking uses thoughtSignature
        // on text/function parts instead.
        if (content instanceof ThinkingMessageContent) {
          continue;
        }
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

  private parseResponse = (
    response: GenerateContentResponse,
  ): InferenceResponse => {
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new InferenceFailedError('No content returned from Gemini', {
        source: 'gemini',
      });
    }

    const modelResponseContent: Array<
      TextMessageContent | ToolUseMessageContent
    > = [];

    for (const part of candidate.content.parts) {
      const thoughtSignature = (part as GeminiPart).thoughtSignature;
      const providerMetadata = thoughtSignature
        ? { gemini: { thoughtSignature } }
        : null;

      if (part.text) {
        modelResponseContent.push(
          new TextMessageContent(part.text, providerMetadata),
        );
      }
      if (part.functionCall) {
        const toolUse = new ToolUseMessageContent(
          part.functionCall.id ?? part.functionCall.name ?? 'unknown',
          part.functionCall.name ?? 'unknown',
          (part.functionCall.args as Record<string, unknown>) ?? {},
          providerMetadata,
        );
        modelResponseContent.push(toolUse);
      }
    }

    const usage = response.usageMetadata;
    const responseMeta: InferenceResponse['meta'] = {
      inputTokens: usage?.promptTokenCount,
      outputTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
    };

    return {
      content: modelResponseContent,
      meta: responseMeta,
    };
  };
}
