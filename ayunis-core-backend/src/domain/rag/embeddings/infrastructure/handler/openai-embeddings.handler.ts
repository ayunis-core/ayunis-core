import { Injectable } from '@nestjs/common';
import { EmbeddingsHandler } from 'src/domain/rag/embeddings/application/ports/embeddings.handler';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';

// Embeddings are small, fast requests. The tight per-attempt timeout turns a
// stalled connection into a quick SDK-level retry instead of hanging the run
// until the SDK's 10-minute default (AYC-422).
const EMBEDDINGS_TIMEOUT_MS = 30_000;

@Injectable()
export class OpenAIEmbeddingsHandler extends EmbeddingsHandler {
  private openai: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = this.configService.get<string>('embeddings.openai.apiKey');
      if (!apiKey) {
        throw new Error('OpenAI embeddings API key not configured');
      }
      this.openai = new OpenAI({ apiKey, timeout: EMBEDDINGS_TIMEOUT_MS });
    }
    return this.openai;
  }

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    const result = await this.getClient().embeddings.create({
      model: model.name,
      input: input,
      dimensions: model.dimensions,
    });

    // Callers pair embeddings with their inputs by position; the API only
    // guarantees the pairing through `index`, not through response order.
    return [...result.data]
      .sort((a, b) => a.index - b.index)
      .map((data) => new Embedding(data.embedding, input[data.index], model));
  }

  isAvailable(): boolean {
    return !!this.configService.get('embeddings.openai.apiKey');
  }
}
