import type { UUID } from 'crypto';
import type { OrgRetentionPolicy } from '../../domain/org-retention-policy.entity';

export abstract class RetentionPoliciesRepository {
  /** Returns the org's policy, or null when none has been configured. */
  abstract findByOrgId(orgId: UUID): Promise<OrgRetentionPolicy | null>;

  /** Creates or replaces the org's policy (unique per org). */
  abstract upsert(policy: OrgRetentionPolicy): Promise<OrgRetentionPolicy>;

  /**
   * Returns every org's policy that has retention enabled
   * (`retentionDays !== null`). Drives the nightly enforcement job.
   */
  abstract findAllEnabled(): Promise<OrgRetentionPolicy[]>;
}
