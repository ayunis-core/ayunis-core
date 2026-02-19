import type { Org } from '../../../domain/org.entity';

export class UpdateOrgCommand {
  constructor(public readonly org: Org) {}
}
