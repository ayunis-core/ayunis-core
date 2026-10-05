import type { UUID } from 'crypto';
export interface SetOrgArchivedCommand {
  orgId: UUID;
  archived: boolean;
}
