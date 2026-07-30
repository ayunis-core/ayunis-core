import type { UUID } from 'crypto';

export interface UserExportRow {
  id: UUID;
  name: string;
  email: string;
  role: string;
  orgName: string;
  teams: string | null;
  subscriptionType: string;
  subscriptionStartsAt: Date | string;
}

export abstract class UsersExportRepository {
  abstract findSubscribedOrgUsers(): Promise<UserExportRow[]>;
}
