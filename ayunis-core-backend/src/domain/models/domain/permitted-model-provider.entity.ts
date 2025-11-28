import { randomUUID, UUID } from 'crypto';
import { ModelProvider } from './value-objects/model-provider.enum';

export class PermittedProvider {
  public readonly id: UUID;
  public readonly provider: ModelProvider;
  public readonly orgId: UUID;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  constructor(params: {
    id?: UUID;
    provider: ModelProvider;
    orgId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.provider = params.provider;
    this.orgId = params.orgId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
