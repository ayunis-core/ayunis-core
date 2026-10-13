import type { InviteRole } from './openapi';

export interface InviteFormData {
  email: string;
  role: InviteRole;
  teamIds: string[];
}
