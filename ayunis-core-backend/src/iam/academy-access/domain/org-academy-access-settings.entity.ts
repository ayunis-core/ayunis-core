import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { AcademyAccessMode } from './value-objects/academy-access-mode.enum';

export class OrgAcademyAccessSettings {
  id: UUID;
  orgId: UUID;
  mode: AcademyAccessMode;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    mode?: AcademyAccessMode;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    // No row means no gate, so existing orgs are unaffected by the migration.
    this.mode = params.mode ?? AcademyAccessMode.UNRESTRICTED;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
