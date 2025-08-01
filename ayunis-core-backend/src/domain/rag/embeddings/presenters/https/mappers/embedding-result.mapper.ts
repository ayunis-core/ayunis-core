import { Injectable } from '@nestjs/common';
import { Embedding } from '../../../domain/embedding.entity';
import {
  EmbeddingResultDto,
  EmbeddingResultsDto,
} from '../dto/embedding-result.dto';

@Injectable()
export class EmbeddingResultMapper {
  mapToDto(result: Embedding[]): EmbeddingResultsDto {
    const results = result.map((r) => ({
      vector: r.vector,
      text: r.text,
      dimension: r.model.dimensions,
      metadata: this.mapMetadata(r),
    }));

    return { results };
  }

  private mapMetadata(result: Embedding): EmbeddingResultDto['metadata'] {
    return {
      provider: result.model.provider,
      model: result.model.name,
      dimension: result.model.dimensions,
    };
  }
}
