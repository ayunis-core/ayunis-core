import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { Model } from './model.entity';
import type { LanguageModel } from './models/language.model';
import type { EmbeddingModel } from './models/embedding.model';
import type { ImageGenerationModel } from './models/image-generation.model';
import { PermittedModelScope } from './value-objects/permitted-model-scope.enum';

export class PermittedModel {
  public readonly id: UUID;
  public readonly model: Model;
  public readonly orgId: UUID;
  public readonly isDefault: boolean;
  public readonly anonymousOnly: boolean;
  public readonly scope: PermittedModelScope;
  public readonly scopeId: UUID | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    model: Model;
    orgId: UUID;
    isDefault?: boolean;
    anonymousOnly?: boolean;
    scope?: PermittedModelScope;
    scopeId?: UUID | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.model = params.model;
    this.orgId = params.orgId;
    this.isDefault = params.isDefault ?? false;
    this.anonymousOnly = params.anonymousOnly ?? false;
    this.scope = params.scope ?? PermittedModelScope.ORG;
    this.scopeId = params.scopeId ?? null;

    if (this.scope === PermittedModelScope.TEAM && this.scopeId === null) {
      throw new Error('scopeId is required when scope is TEAM');
    }
    if (this.scope === PermittedModelScope.ORG && this.scopeId !== null) {
      throw new Error('scopeId must be null when scope is ORG');
    }

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
    anonymousOnly?: boolean;
    scope?: PermittedModelScope;
    scopeId?: UUID | null;
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
    anonymousOnly?: boolean;
    scope?: PermittedModelScope;
    scopeId?: UUID | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(params);
    this.model = params.model;
  }
}

export class PermittedImageGenerationModel extends PermittedModel {
  public readonly model: ImageGenerationModel;
  constructor(params: {
    id?: UUID;
    model: ImageGenerationModel;
    orgId: UUID;
    isDefault?: boolean;
    anonymousOnly?: boolean;
    scope?: PermittedModelScope;
    scopeId?: UUID | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(params);
    this.model = params.model;
  }
}
