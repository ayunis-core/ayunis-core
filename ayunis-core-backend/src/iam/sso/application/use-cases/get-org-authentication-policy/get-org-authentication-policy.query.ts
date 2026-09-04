import type { UUID } from 'crypto';

export class GetOrgAuthenticationPolicyQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly lockForSessionIssuance = false,
  ) {}
}
