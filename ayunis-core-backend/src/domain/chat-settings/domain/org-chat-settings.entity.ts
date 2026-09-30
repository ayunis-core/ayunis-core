import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class OrgChatSettings {
  id: UUID;
  orgId: UUID;
  internetSearchEnabled: boolean;
  anonymousModeByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    internetSearchEnabled?: boolean;
    anonymousModeByDefault?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.internetSearchEnabled = params.internetSearchEnabled ?? true;
    this.anonymousModeByDefault = params.anonymousModeByDefault ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
