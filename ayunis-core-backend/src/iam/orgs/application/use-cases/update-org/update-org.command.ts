import type { UUID } from 'crypto';

export class UpdateOrgCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly name: string,
  ) {}
}
