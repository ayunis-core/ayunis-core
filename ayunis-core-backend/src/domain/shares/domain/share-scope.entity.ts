import { randomUUID, UUID } from 'crypto';
import { ShareScopeType } from './value-objects/share-scope-type.enum';

export abstract class ShareScope {
  id: UUID;
  scopeType: ShareScopeType;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    scopeType: ShareScopeType;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.scopeType = params.scopeType;
    this.createdAt = params.createdAt || new Date();
    this.updatedAt = params.updatedAt || new Date();
  }
}

export class OrgShareScope extends ShareScope {
  orgId: UUID;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, scopeType: ShareScopeType.ORG });
    this.orgId = params.orgId;
  }
}

export class TeamShareScope extends ShareScope {
  teamId: UUID;

  constructor(params: {
    id?: UUID;
    teamId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({ ...params, scopeType: ShareScopeType.TEAM });
    this.teamId = params.teamId;
  }
}
