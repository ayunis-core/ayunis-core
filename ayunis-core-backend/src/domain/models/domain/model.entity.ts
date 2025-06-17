import { ModelProvider } from './value-objects/model-provider.object';

export class Model {
  constructor(
    public readonly name: string,
    public readonly provider: ModelProvider,
  ) {}

  equals(other: Model): boolean {
    return this.name === other.name && this.provider === other.provider;
  }
}
