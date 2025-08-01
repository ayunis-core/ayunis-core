import { randomUUID, UUID } from 'crypto';
import { Model } from './model.entity';
import { LanguageModel } from './models/language.model';
import { EmbeddingModel } from './models/embedding.model';

export class PermittedModel {
  public readonly id: UUID;
  public readonly model: Model;
  public readonly orgId: UUID;
  public readonly isDefault: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    model: Model;
    orgId: UUID;
    isDefault?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.model = params.model;
    this.orgId = params.orgId;
    this.isDefault = params.isDefault ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

export class PermittedLanguageModel extends PermittedModel {
  public readonly model: LanguageModel;
  constructor(params: {
    id?: UUID;
    model: LanguageModel;
    orgId: UUID;
    isDefault?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(params);
    this.model = params.model;
  }
}

export class PermittedEmbeddingModel extends PermittedModel {
  public readonly model: EmbeddingModel;
  constructor(params: {
    id?: UUID;
    model: EmbeddingModel;
    orgId: UUID;
    isDefault?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(params);
    this.model = params.model;
  }
}
