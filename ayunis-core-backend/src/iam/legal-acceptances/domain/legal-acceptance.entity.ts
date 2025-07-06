import { randomUUID, UUID } from 'crypto';
import { LegalAcceptanceType } from './value-objects/legal-acceptance-type.enum';

export abstract class LegalAcceptance {
  id: UUID;
  userId: string;
  orgId: string;
  version: string;
  type: LegalAcceptanceType;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: string;
    orgId: string;
    version: string;
    type: LegalAcceptanceType;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.version = params.version;
    this.type = params.type;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
