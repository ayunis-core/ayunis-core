import { randomUUID, UUID } from 'crypto';
import { SharedEntityType } from './value-objects/shared-entity-type.enum';
import { ShareScope } from './share-scope.entity';

export abstract class Share {
  id: UUID;
  entityType: SharedEntityType;
  scope: ShareScope;
  ownerId: UUID;
  createdAt: Date;
  updatedAt: Date;

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
