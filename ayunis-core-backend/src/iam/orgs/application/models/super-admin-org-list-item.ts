import type { Org } from 'src/iam/orgs/domain/org.entity';

export interface SuperAdminOrgListItem {
  org: Org;
  paying: boolean;
}
