import type { Org } from 'src/iam/orgs/domain/org.entity';
import type { OrgLifecycleStatus } from './org-lifecycle-status';

export interface SuperAdminOrgListItem {
  org: Org;
  lifecycleStatus: OrgLifecycleStatus;
}
