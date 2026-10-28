import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { OrgLifecycleCounts } from './org-lifecycle-status';
import type { SuperAdminOrgOverview } from './super-admin-org-overview';

export interface SuperAdminOrgList {
  page: Paginated<SuperAdminOrgOverview>;
  lifecycleCounts: OrgLifecycleCounts;
}
