import { Injectable, Logger } from '@nestjs/common';
import { GetDefaultModelQuery } from './get-default-model.query';
import { EmbeddingModel } from '../../../domain/embedding-model.entity';
import { OPENAI_EMBEDDING_MODEL_SMALL } from '../../models/openai-embedding.model';

@Injectable()
export class GetDefaultModelUseCase {
  private readonly logger = new Logger(GetDefaultModelUseCase.name);

  execute(query: GetDefaultModelQuery): EmbeddingModel {
    this.logger.log('execute', query);
    return OPENAI_EMBEDDING_MODEL_SMALL;
  }
}
