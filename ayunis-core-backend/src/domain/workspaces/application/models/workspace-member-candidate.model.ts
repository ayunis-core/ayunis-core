import type { UUID } from 'crypto';

export interface WorkspaceMemberCandidate {
  userId: UUID;
  name: string;
  email: string;
}
