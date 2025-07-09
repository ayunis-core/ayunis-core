import { randomUUID, UUID } from 'crypto';
import { ModelProvider } from './value-objects/model-provider.enum';

export class Model {
  public readonly id: UUID;
  public readonly name: string;
  public readonly provider: ModelProvider;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly displayName: string;
  public readonly canStream: boolean;
  public readonly isReasoning: boolean;
  public readonly isArchived: boolean;

  constructor(params: {
    id?: UUID;
    name: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
    displayName: string;
    canStream: boolean;
    isReasoning: boolean;
    isArchived: boolean;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.provider = params.provider;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    this.displayName = params.displayName;
    this.canStream = params.canStream;
    this.isReasoning = params.isReasoning;
    this.isArchived = params.isArchived;
  }
}
