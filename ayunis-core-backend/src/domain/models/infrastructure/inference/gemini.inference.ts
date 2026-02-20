import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { ConfigService } from '@nestjs/config';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { GoogleGenAI } from '@google/genai';
import type { Part, GenerateContentResponse } from '@google/genai';
import { GeminiMessageConverter } from '../converters/gemini-message.converter';

@Injectable()
export class GeminiInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(GeminiInferenceHandler.name);
  private readonly client: GoogleGenAI;
  private readonly converter: GeminiMessageConverter;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    super();
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('models.gemini.apiKey'),
    });
    this.converter = new GeminiMessageConverter(imageContentService);
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
      const contents = await this.converter.convertMessages(messages, orgId);
      const config = this.converter.buildConfig({
        systemPrompt: input.systemPrompt,
        tools,
        toolChoice,
      });

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

  private parseResponse = (
    response: GenerateContentResponse,
  ): InferenceResponse => {
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new InferenceFailedError('No content returned from Gemini', {
        source: 'gemini',
      });
    }

    const content = candidate.content.parts.flatMap((part) =>
      this.parseResponsePart(part),
    );
    const usage = response.usageMetadata;
    return {
      content,
      meta: {
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        totalTokens: usage?.totalTokenCount,
      },
    };
  };

  private parseResponsePart(
    part: Part,
  ): Array<TextMessageContent | ToolUseMessageContent> {
    const providerMetadata = this.converter.extractProviderMetadata(part);
    const result: Array<TextMessageContent | ToolUseMessageContent> = [];
    if (part.text) {
      result.push(new TextMessageContent(part.text, providerMetadata));
    }
    if (part.functionCall) {
      result.push(
        new ToolUseMessageContent(
          part.functionCall.id ?? part.functionCall.name ?? 'unknown',
          part.functionCall.name ?? 'unknown',
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- args can be undefined at runtime
          (part.functionCall.args as Record<string, unknown>) ?? {},
          providerMetadata,
        ),
      );
    }
    return result;
  }
}
