import { UUID } from 'crypto';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { Model } from '../../domain/model.entity';

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
  abstract create(model: Model): Promise<Model>;
  abstract update(id: UUID, model: Model): Promise<Model>;
  abstract delete(id: UUID): Promise<void>;
}
