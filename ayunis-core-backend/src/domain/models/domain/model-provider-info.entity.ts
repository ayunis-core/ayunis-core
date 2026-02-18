import { ModelProvider } from './value-objects/model-provider.enum';
import { ModelProviderLocation } from './value-objects/model-provider-locations.enum';

export class ModelProviderInfoEntity {
  provider: ModelProvider;
  displayName: string;
  hostedIn: ModelProviderLocation;
}
