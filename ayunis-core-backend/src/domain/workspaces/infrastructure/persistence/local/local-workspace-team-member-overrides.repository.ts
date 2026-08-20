import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  WorkspaceTeamMemberOverridesRepository,
  type WorkspaceTeamMemberOverride,
  type WorkspaceTeamMemberOverrideInput,
} from 'src/domain/workspaces/application/ports/workspace-team-member-overrides-repository.port';
import { WorkspaceTeamMemberOverrideMapper } from './mappers/workspace-team-member-override.mapper';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

@Injectable()
export class LocalWorkspaceTeamMemberOverridesRepository extends WorkspaceTeamMemberOverridesRepository {
  constructor(
    @InjectRepository(WorkspaceTeamGrantRecord)
    private readonly grantRepository: Repository<WorkspaceTeamGrantRecord>,
    @InjectRepository(WorkspaceTeamMemberOverrideRecord)
    private readonly overrideRepository: Repository<WorkspaceTeamMemberOverrideRecord>,
    private readonly mapper: WorkspaceTeamMemberOverrideMapper,
  ) {
    super();
  }

  async upsertOverride(
    workspaceId: UUID,
    teamId: UUID,
    input: WorkspaceTeamMemberOverrideInput,
  ): Promise<WorkspaceTeamMemberOverride | null> {
    const teamGrantId = await this.findTeamGrantId(workspaceId, teamId);
    if (!teamGrantId) return null;
    const record = this.mapper.toRecord({ teamGrantId, ...input });
    await this.overrideRepository
      .createQueryBuilder()
      .insert()
      .values(record)
      .orUpdate(['role', 'excluded'], ['teamGrantId', 'userId'])
      .execute();
    return this.mapper.toDomain(record);
  }

  async deleteOverride(
    workspaceId: UUID,
    teamId: UUID,
    userId: UUID,
  ): Promise<boolean> {
    const teamGrantId = await this.findTeamGrantId(workspaceId, teamId);
    if (!teamGrantId) return false;
    const result = await this.overrideRepository.delete({
      teamGrantId,
      userId,
    });
    return result.affected === 1;
  }

  private async findTeamGrantId(
    workspaceId: UUID,
    teamId: UUID,
  ): Promise<UUID | null> {
    const grant = await this.grantRepository.findOne({
      select: { id: true },
      where: { workspaceId, teamId },
    });
    return grant?.id ?? null;
  }
}
