import type { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import type { OparlEmbeddingModelResponseDto } from 'src/domain/oparl/presenters/http/dto/oparl-embedding-model.dto';

export function toOparlEmbeddingModelResponseDto(
  model: EmbeddingModel | null,
): OparlEmbeddingModelResponseDto {
  return {
    model: model && {
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      dimensions: model.dimensions,
    },
  };
}
