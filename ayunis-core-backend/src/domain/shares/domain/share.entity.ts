import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { SharedEntityType } from './value-objects/shared-entity-type.enum';
import type { ShareScope } from './share-scope.entity';

export abstract class Share {
  id: UUID;
  entityType: SharedEntityType;
  scope: ShareScope;
  ownerId: UUID;
  createdAt: Date;
  updatedAt: Date;

  abstract get entityId(): UUID;

  constructor(params: {
    id?: UUID;
    entityType: SharedEntityType;
    scope: ShareScope;
    ownerId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.entityType = params.entityType;
    this.scope = params.scope;
    this.ownerId = params.ownerId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}

export class AgentShare extends Share {
  agentId: UUID;

  get entityId(): UUID {
    return this.agentId;
  }

  constructor(params: {
    id?: UUID;
    scope: ShareScope;
    agentId: UUID;
    ownerId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, entityType: SharedEntityType.AGENT });
    this.agentId = params.agentId;
  }
}

export class SkillShare extends Share {
  skillId: UUID;

  get entityId(): UUID {
    return this.skillId;
  }

  constructor(params: {
    id?: UUID;
    scope: ShareScope;
    skillId: UUID;
    ownerId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, entityType: SharedEntityType.SKILL });
    this.skillId = params.skillId;
  }
}

export class KnowledgeBaseShare extends Share {
  knowledgeBaseId: UUID;

  get entityId(): UUID {
    return this.knowledgeBaseId;
  }

  constructor(params: {
    id?: UUID;
    scope: ShareScope;
    knowledgeBaseId: UUID;
    ownerId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, entityType: SharedEntityType.KNOWLEDGE_BASE });
    this.knowledgeBaseId = params.knowledgeBaseId;
  }
}
