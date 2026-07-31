import type { UUID } from 'crypto';

export class GetOrgAcademyAccessSettingsQuery {
  constructor(public readonly orgId: UUID) {}
}
