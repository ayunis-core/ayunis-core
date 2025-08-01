import { EmbeddingModel } from '../../domain/embedding-model.entity';
import { EmbeddingsProvider } from '../../domain/embeddings-provider.enum';

export const MISTRAL_EMBEDDING_MODEL = new EmbeddingModel(
  'mistral-embed',
  EmbeddingsProvider.MISTRAL,
  1024,
);
