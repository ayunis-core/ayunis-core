import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class OrgChatSettings {
  id: UUID;
  orgId: UUID;
  internetSearchEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    internetSearchEnabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    // Internet access is enabled by default; admins can opt out.
    this.internetSearchEnabled = params.internetSearchEnabled ?? true;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
