import type { UUID } from 'crypto';
import type { OrgMfaRequirement } from '../../domain/org-mfa-requirement.entity';

export abstract class OrgMfaRequirementsRepository {
  abstract findByOrgId(orgId: UUID): Promise<OrgMfaRequirement | null>;

  abstract upsert(requirement: OrgMfaRequirement): Promise<OrgMfaRequirement>;
}
