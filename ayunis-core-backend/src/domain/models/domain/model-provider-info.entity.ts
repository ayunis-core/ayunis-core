import type { ModelProvider } from './value-objects/model-provider.enum';
import type { ModelProviderLocation } from './value-objects/model-provider-locations.enum';

export class ModelProviderInfoEntity {
  provider: ModelProvider;
  displayName: string;
  hostedIn: ModelProviderLocation;
}
