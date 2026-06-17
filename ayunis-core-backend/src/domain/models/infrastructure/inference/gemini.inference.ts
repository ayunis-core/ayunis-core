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
  private readonly apiKey?: string;
  private client?: GoogleGenAI;
  private readonly converter: GeminiMessageConverter;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    super();
    // Construct lazily: GoogleGenAI throws if the API key is missing, and this
    // handler is instantiated at boot regardless of whether Gemini is
    // configured. Only build the client when it is actually used.
    this.apiKey = this.configService.get<string>('models.gemini.apiKey')?.trim();
    this.converter = new GeminiMessageConverter(imageContentService);
  }

  private getClient(): GoogleGenAI {
    if (!this.apiKey) {
      throw new InferenceFailedError('Gemini API key is not configured', {
        source: 'gemini',
      });
    }
    return (this.client ??= new GoogleGenAI({ apiKey: this.apiKey }));
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    const { messages, tools, toolChoice, orgId } = input;
    const contents = await this.converter.convertMessages(messages, orgId);
    const config = this.converter.buildConfig({
      systemPrompt: input.systemPrompt,
      tools,
      toolChoice,
    });

      const completionFn = () =>
        this.getClient().models.generateContent({
          model: input.model.name,
          contents,
          config,
        });
    this.logger.debug('generateContent config prepared', {
      model: input.model.name,
      messageCount: contents.length,
      toolCount: tools.length,
      hasSystem: Boolean(input.systemPrompt),
    });

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
