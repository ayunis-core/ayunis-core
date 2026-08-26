import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { In, Repository } from 'typeorm';
import {
  WorkspaceSharingReadRepository,
  type WorkspaceSharingSnapshot,
} from 'src/domain/workspaces/application/ports/workspace-sharing-read-repository.port';
import { WorkspaceSharingMapper } from './mappers/workspace-sharing.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

@Injectable()
export class LocalWorkspaceSharingReadRepository extends WorkspaceSharingReadRepository {
  constructor(
    @InjectRepository(WorkspaceMemberRecord)
    private readonly memberRepository: Repository<WorkspaceMemberRecord>,
    @InjectRepository(WorkspaceTeamGrantRecord)
    private readonly grantRepository: Repository<WorkspaceTeamGrantRecord>,
    @InjectRepository(WorkspaceTeamMemberOverrideRecord)
    private readonly overrideRepository: Repository<WorkspaceTeamMemberOverrideRecord>,
    private readonly mapper: WorkspaceSharingMapper,
  ) {
    super();
  }

  async findSharing(workspaceId: UUID): Promise<WorkspaceSharingSnapshot> {
    const [members, grants] = await Promise.all([
      this.memberRepository.find({ where: { workspaceId } }),
      this.grantRepository.find({ where: { workspaceId } }),
    ]);
    const overrides = await this.findOverrides(grants);
    return this.mapper.toSnapshot(members, grants, overrides);
  }

  private findOverrides(
    grants: WorkspaceTeamGrantRecord[],
  ): Promise<WorkspaceTeamMemberOverrideRecord[]> {
    if (grants.length === 0) return Promise.resolve([]);
    return this.overrideRepository.find({
      where: { teamGrantId: In(grants.map(({ id }) => id)) },
    });
  }
}
