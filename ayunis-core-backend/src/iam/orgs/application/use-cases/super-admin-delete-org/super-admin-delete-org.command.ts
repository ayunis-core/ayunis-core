import type { UUID } from 'crypto';
export interface SuperAdminDeleteOrgCommand {
  orgId: UUID;
  confirmationName: string;
}
