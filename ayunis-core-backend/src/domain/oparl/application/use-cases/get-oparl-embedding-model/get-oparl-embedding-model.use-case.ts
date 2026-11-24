import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlChunkEmbedder } from 'src/domain/oparl/application/services/oparl-chunk-embedder.service';

/** The model that embeds the mirror, `null` while none is chosen (or it left the catalog). */
@Injectable()
export class GetOparlEmbeddingModelUseCase {
  constructor(private readonly embedder: OparlChunkEmbedder) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(): Promise<EmbeddingModel | null> {
    return this.embedder.currentModel();
  }
}
