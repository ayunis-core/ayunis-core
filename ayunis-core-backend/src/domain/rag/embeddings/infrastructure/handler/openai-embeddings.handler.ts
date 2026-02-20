import { Injectable } from '@nestjs/common';
import { EmbeddingsHandler } from '../../application/ports/embeddings.handler';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { Embedding } from '../../domain/embedding.entity';
import { EmbeddingModel } from '../../domain/embedding-model.entity';

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
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    const result = await this.getClient().embeddings.create({
      model: model.name,
      input: input,
      dimensions: model.dimensions,
    });

    return result.data.map((data) => {
      return new Embedding(data.embedding, input[data.index], model);
    });
  }

  isAvailable(): boolean {
    // TODO
    return !!this.configService.get('embeddings.openai.apiKey');
  }
}
