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
import { GoogleGenAI } from '@google/genai';
import type {
  GenerateContentConfig,
  GenerateContentResponse,
} from '@google/genai';
import { GeminiConversionService } from '../util/gemini-conversion.service';

@Injectable()
export class GeminiInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(GeminiInferenceHandler.name);
  private readonly client: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiConversionService: GeminiConversionService,
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
      const contents = await this.geminiConversionService.convertMessages(
        messages,
        orgId,
      );

      const geminiTools = tools?.length
        ? [
            {
              functionDeclarations: tools.map(
                this.geminiConversionService.convertTool,
              ),
            },
          ]
        : undefined;

      const config: GenerateContentConfig = {
        systemInstruction: input.systemPrompt
          ? { role: 'user', parts: [{ text: input.systemPrompt }] }
          : undefined,
        tools: geminiTools,
        toolConfig:
          toolChoice && tools?.length
            ? {
                functionCallingConfig:
                  this.geminiConversionService.convertToolChoice(toolChoice),
              }
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
      if (part.text) {
        modelResponseContent.push(new TextMessageContent(part.text));
      }
      if (part.functionCall) {
        const toolUse = new ToolUseMessageContent(
          part.functionCall.id ?? part.functionCall.name ?? 'unknown',
          part.functionCall.name ?? 'unknown',
          (part.functionCall.args as Record<string, unknown>) ?? {},
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
