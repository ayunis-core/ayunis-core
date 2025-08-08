import { UUID } from 'crypto';
import { EmbeddingModel } from 'src/domain/rag/embeddings/domain/embedding-model.entity';

export class EmbedTextCommand {
  model: EmbeddingModel;
  texts: string[];

  constructor(params: { model: EmbeddingModel; texts: string[]; orgId: UUID }) {
    this.model = params.model;
    this.texts = params.texts;
  }
}
