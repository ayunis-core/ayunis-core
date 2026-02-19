import type { ModelProvider } from './model-provider.enum';

export class ModelProviderInfo {
  provider: ModelProvider;
  displayName: string;

  constructor(params: { provider: ModelProvider; displayName: string }) {
    this.provider = params.provider;
    this.displayName = params.displayName;
  }
}
