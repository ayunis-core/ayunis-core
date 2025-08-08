import { Injectable } from '@nestjs/common';
import { EmbeddingsHandler } from '../../application/ports/embeddings.handler';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { Embedding } from '../../domain/embedding.entity';
import { EmbeddingModel } from '../../domain/embedding-model.entity';

@Injectable()
export class OpenAIEmbeddingsHandler extends EmbeddingsHandler {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    super();
    this.openai = new OpenAI({
      apiKey: this.configService.get('embeddings.openai.apiKey'),
    });
  }

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    const result = await this.openai.embeddings.create({
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
