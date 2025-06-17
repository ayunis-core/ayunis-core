import { Injectable } from '@nestjs/common';
import { EmbeddingsHandler } from '../../application/ports/embeddings.handler';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { Embedding } from '../../domain/embedding.entity';
import { EmbeddingModel } from '../../domain/embedding-model.entity';

@Injectable()
export class OpenAIEmbeddingsHandler extends EmbeddingsHandler {
  private readonly openai: OpenAI;
  private readonly model = 'text-embedding-3-small';

  constructor(private readonly configService: ConfigService) {
    super();
    this.openai = new OpenAI({
      apiKey: this.configService.get('embeddings.openai.apiKey'),
    });
  }

  async embed(input: string[], model: EmbeddingModel): Promise<Embedding[]> {
    const result = await this.openai.embeddings.create({
      model: this.model,
      input: input,
      // This reduces the number of dimensions to 1536,
      // so that we can save it to the database
      dimensions: 1536,
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
