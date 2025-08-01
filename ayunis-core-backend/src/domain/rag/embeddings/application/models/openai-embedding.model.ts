import { EmbeddingModel } from '../../domain/embedding-model.entity';
import { EmbeddingsProvider } from '../../domain/embeddings-provider.enum';

export const OPENAI_EMBEDDING_MODEL_SMALL = new EmbeddingModel(
  'text-embedding-3-large',
  EmbeddingsProvider.OPENAI,
  1536,
);
