import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export type GetModelQuery =
  | {
      id: UUID;
    }
  | {
      name: string;
      provider: ModelProvider;
    };
