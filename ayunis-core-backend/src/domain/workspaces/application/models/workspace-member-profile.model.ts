import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';

export interface WorkspaceMemberProfile {
  member: WorkspaceMember;
  name: string;
  email: string;
}
