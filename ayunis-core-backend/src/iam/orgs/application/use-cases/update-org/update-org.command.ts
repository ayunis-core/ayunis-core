import type { Org } from 'src/iam/orgs/domain/org.entity';

export class UpdateOrgCommand {
  constructor(public readonly org: Org) {}
}
