import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';

export enum EmbeddingModelCatalogErrorCode {
  EMBEDDING_MODEL_IN_USE = 'EMBEDDING_MODEL_IN_USE',
}

export type EmbeddingModelVectorField = 'name' | 'dimensions';

export class EmbeddingModelInUseError extends ApplicationError {
  constructor(modelId: UUID, fields: EmbeddingModelVectorField[]) {
    super(
      'Cannot change the name or dimensions of an embedding model while documents are indexed with it.',
      EmbeddingModelCatalogErrorCode.EMBEDDING_MODEL_IN_USE,
      409,
      { modelId, fields },
    );
  }
}
