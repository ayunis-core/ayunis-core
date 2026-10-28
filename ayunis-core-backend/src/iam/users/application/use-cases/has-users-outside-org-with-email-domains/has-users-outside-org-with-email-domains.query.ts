import type { UUID } from 'crypto';

export class HasUsersOutsideOrgWithEmailDomainsQuery {
  constructor(
    readonly orgId: UUID,
    readonly emailDomains: string[],
  ) {}
}
