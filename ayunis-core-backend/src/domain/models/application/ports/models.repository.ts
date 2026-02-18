import { UUID } from 'crypto';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { Model } from '../../domain/model.entity';
import { EmbeddingModel } from '../../domain/models/embedding.model';
import { LanguageModel } from '../../domain/models/language.model';

export type FindOneModelParams =
  | {
      id: UUID;
    }
  | {
      name: string;
      provider: ModelProvider;
    };

export abstract class ModelsRepository {
  abstract findAll(): Promise<Model[]>;
  abstract findOne(params: FindOneModelParams): Promise<Model | undefined>;
  abstract findOneLanguage(id: UUID): Promise<LanguageModel | undefined>;
  abstract findOneEmbedding(id: UUID): Promise<EmbeddingModel | undefined>;
  abstract save(model: Model): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
}
