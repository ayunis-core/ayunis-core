import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  WorkspaceInvitationsReadRepository,
  type WorkspaceInvitation,
} from 'src/domain/workspaces/application/ports/workspace-invitations-read-repository.port';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceInvitationMapper } from './mappers/workspace-invitation.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';

@Injectable()
export class LocalWorkspaceInvitationsReadRepository extends WorkspaceInvitationsReadRepository {
  constructor(
    @InjectRepository(WorkspaceMemberRecord)
    private readonly repository: Repository<WorkspaceMemberRecord>,
    private readonly mapper: WorkspaceInvitationMapper,
  ) {
    super();
  }

  async findPendingByUser(
    userId: UUID,
    orgId: UUID,
  ): Promise<WorkspaceInvitation[]> {
    const records = await this.repository.find({
      relations: { workspace: true },
      where: {
        userId,
        status: WorkspaceMemberStatus.PENDING,
        workspace: { orgId },
      },
    });
    return records.map((record) => this.mapper.toView(record));
  }
}
