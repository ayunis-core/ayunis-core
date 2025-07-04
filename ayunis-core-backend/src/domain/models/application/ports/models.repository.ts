import { UUID } from 'crypto';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ModelWithConfig } from '../../domain/model-with-config.entity';

export type FindOneModelParams =
  | {
      id: UUID;
    }
  | {
      name: string;
      provider: ModelProvider;
    };

export abstract class ModelsRepository {
  abstract findAll(): Promise<ModelWithConfig[]>;
  abstract findOne(
    params: FindOneModelParams,
  ): Promise<ModelWithConfig | undefined>;
  abstract create(model: ModelWithConfig): Promise<ModelWithConfig>;
  abstract update(id: UUID, model: ModelWithConfig): Promise<ModelWithConfig>;
  abstract delete(id: UUID): Promise<void>;
}
