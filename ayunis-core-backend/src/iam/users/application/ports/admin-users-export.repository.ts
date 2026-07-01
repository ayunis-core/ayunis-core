import type { UUID } from 'crypto';

export interface AdminUserExportRow {
  id: UUID;
  name: string;
  email: string;
  role: string;
  orgName: string;
  teams: string | null;
  subscriptionType: string;
  subscriptionStartsAt: Date | string;
}

export abstract class AdminUsersExportRepository {
  abstract findSubscribedOrgAdmins(): Promise<AdminUserExportRow[]>;
}
