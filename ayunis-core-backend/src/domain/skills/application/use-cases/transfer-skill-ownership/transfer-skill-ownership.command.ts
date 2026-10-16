import type { UUID } from 'crypto';

export type SkillTransferTarget =
  { type: 'team'; teamId: UUID } | { type: 'org' };

export class TransferSkillOwnershipCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly requesterId: UUID,
    public readonly orgId: UUID,
    public readonly target: SkillTransferTarget,
  ) {}
}
