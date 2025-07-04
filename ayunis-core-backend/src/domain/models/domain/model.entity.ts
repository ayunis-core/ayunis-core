import { randomUUID, UUID } from 'crypto';
import { ModelProvider } from './value-objects/model-provider.object';

export class Model {
  public readonly id: UUID;
  public readonly name: string;
  public readonly provider: ModelProvider;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.provider = params.provider;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
