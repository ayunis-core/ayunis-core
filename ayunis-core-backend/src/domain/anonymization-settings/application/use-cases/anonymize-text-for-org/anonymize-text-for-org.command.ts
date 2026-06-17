import type { UUID } from 'crypto';

export class AnonymizeTextForOrgCommand {
  constructor(
    public readonly text: string,
    public readonly orgId: UUID,
  ) {}
}
