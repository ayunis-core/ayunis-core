import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { OrgLifecycleStatus } from './org-lifecycle-status';

export interface SuperAdminOrgOverview {
  org: Org;
  lifecycleStatus: OrgLifecycleStatus;
}
