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
import { GoogleGenAI } from '@google/genai';
import type {
  GenerateContentConfig,
  GenerateContentResponse,
} from '@google/genai';
import { GeminiConversionService } from '../util/gemini-conversion.service';

@Injectable()
export class GeminiStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(GeminiStreamInferenceHandler.name);
  private readonly client: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiConversionService: GeminiConversionService,
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
      subscriber.error(error);
    }
  }

  private convertChunk = (
    chunk: GenerateContentResponse,
  ): StreamInferenceResponseChunk[] => {
    const results: StreamInferenceResponseChunk[] = [];
    const candidate = chunk.candidates?.[0];

    if (candidate?.content?.parts) {
      for (const [index, part] of candidate.content.parts.entries()) {
        if (part.text) {
          results.push(
            new StreamInferenceResponseChunk({
              thinkingDelta: null,
              textContentDelta: part.text,
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
