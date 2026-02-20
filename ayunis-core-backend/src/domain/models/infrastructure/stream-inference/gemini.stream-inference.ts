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
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { GoogleGenAI } from '@google/genai';
import type { Part, GenerateContentResponse } from '@google/genai';
import { GeminiMessageConverter } from '../converters/gemini-message.converter';

@Injectable()
export class GeminiStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(GeminiStreamInferenceHandler.name);
  private readonly client: GoogleGenAI;
  private readonly converter: GeminiMessageConverter;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('models.gemini.apiKey'),
    });
    this.converter = new GeminiMessageConverter(imageContentService);
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
      const { messages, toolChoice, orgId } = input;
      const contents = await this.converter.convertMessages(messages, orgId);
      const config = this.converter.buildConfig({
        systemPrompt: input.systemPrompt,
        tools: input.tools,
        toolChoice,
      });

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

      // Gemini sends usageMetadata on every streaming chunk:
      // promptTokenCount is repeated on each chunk, candidatesTokenCount
      // only appears on the final chunk.  Summing across chunks would
      // over-count promptTokenCount.  We take only the last values.
      let lastUsage: { inputTokens?: number; outputTokens?: number } | null =
        null;

      for await (const chunk of stream) {
        const { contentChunks, usage } = this.convertChunk(chunk);
        for (const delta of contentChunks) {
          subscriber.next(delta);
        }
        if (usage) {
          lastUsage = usage;
        }
      }

      if (lastUsage) {
        subscriber.next(
          new StreamInferenceResponseChunk({
            thinkingDelta: null,
            textContentDelta: null,
            toolCallsDelta: [],
            usage: lastUsage,
          }),
        );
      }

      subscriber.complete();
    } catch (error) {
      this.logger.error('Gemini streaming inference failed', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as Record<string, unknown>).status,
        contents: JSON.stringify(error).substring(0, 2000),
      });
      subscriber.error(error);
    }
  }

  /**
   * Converts a Gemini streaming chunk into content deltas and usage.
   * Usage is returned separately because Gemini reports cumulative totals
   * on every chunk — the caller must buffer and emit only the final values.
   */
  private convertChunk = (
    chunk: GenerateContentResponse,
  ): {
    contentChunks: StreamInferenceResponseChunk[];
    usage: { inputTokens?: number; outputTokens?: number } | null;
  } => {
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    const contentChunks = parts.flatMap((part, index) =>
      this.convertPart(part, index),
    );

    const usageMetadata = chunk.usageMetadata;
    const usage = usageMetadata
      ? {
          inputTokens: usageMetadata.promptTokenCount,
          outputTokens: usageMetadata.candidatesTokenCount,
        }
      : null;

    return { contentChunks, usage };
  };

  private convertPart = (
    part: Part,
    index: number,
  ): StreamInferenceResponseChunk[] => {
    const chunks: StreamInferenceResponseChunk[] = [];
    if (part.text) {
      chunks.push(this.convertTextPart(part));
    }
    if (part.functionCall) {
      chunks.push(this.convertFunctionCallPart(part, index));
    }
    return chunks;
  };

  private convertTextPart = (part: Part): StreamInferenceResponseChunk => {
    const providerMetadata = this.converter.extractProviderMetadata(part);
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: part.text ?? null,
      textProviderMetadata: providerMetadata,
      toolCallsDelta: [],
    });
  };

  private convertFunctionCallPart = (
    part: Part,
    index: number,
  ): StreamInferenceResponseChunk => {
    const providerMetadata = this.converter.extractProviderMetadata(part);
    const fc = part.functionCall!;
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [
        new StreamInferenceResponseChunkToolCall({
          index,
          id: fc.id ?? fc.name ?? null,
          name: fc.name ?? null,
          argumentsDelta: fc.args ? JSON.stringify(fc.args) : null,
          providerMetadata,
        }),
      ],
    });
  };
}
