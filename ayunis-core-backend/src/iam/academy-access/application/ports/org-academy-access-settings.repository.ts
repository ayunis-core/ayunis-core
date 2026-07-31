import type { UUID } from 'crypto';
import type { OrgAcademyAccessSettings } from '../../domain/org-academy-access-settings.entity';

export abstract class OrgAcademyAccessSettingsRepository {
  abstract findByOrgId(orgId: UUID): Promise<OrgAcademyAccessSettings | null>;
  abstract upsert(
    settings: OrgAcademyAccessSettings,
  ): Promise<OrgAcademyAccessSettings>;
}
