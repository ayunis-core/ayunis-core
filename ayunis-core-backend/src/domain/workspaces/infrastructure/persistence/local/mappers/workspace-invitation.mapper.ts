import { Injectable } from '@nestjs/common';
import type { WorkspaceInvitation } from 'src/domain/workspaces/application/ports/workspace-invitations-read-repository.port';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';
import { WorkspaceMapper } from './workspace.mapper';

@Injectable()
export class WorkspaceInvitationMapper {
  constructor(private readonly workspaceMapper: WorkspaceMapper) {}

  toView(record: WorkspaceMemberRecord): WorkspaceInvitation {
    return {
      workspace: this.workspaceMapper.toDomain(record.workspace),
      role: record.role,
    };
  }
}
