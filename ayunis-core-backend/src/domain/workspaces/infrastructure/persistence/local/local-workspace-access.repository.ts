import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { UUID } from 'crypto';
import {
  WorkspaceAccessRepository,
  type FindWorkspaceAccessListParams,
  type FindWorkspaceAccessParams,
  type WorkspaceAccessSnapshot,
} from 'src/domain/workspaces/application/ports/workspace-access-repository.port';
import type { TeamGrantCandidate } from 'src/domain/workspaces/application/services/workspace-access-policy.service';
import type { WorkspaceListOptions } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

@Injectable()
export class LocalWorkspaceAccessRepository extends WorkspaceAccessRepository {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly workspaceRepo: Repository<WorkspaceRecord>,
    @InjectRepository(WorkspaceMemberRecord)
    private readonly memberRepo: Repository<WorkspaceMemberRecord>,
    @InjectRepository(WorkspaceTeamGrantRecord)
    private readonly teamGrantRepo: Repository<WorkspaceTeamGrantRecord>,
    @InjectRepository(WorkspaceTeamMemberOverrideRecord)
    private readonly overrideRepo: Repository<WorkspaceTeamMemberOverrideRecord>,
    private readonly mapper: WorkspaceMapper,
  ) {
    super();
  }

  async findAccessSnapshot(
    params: FindWorkspaceAccessParams,
  ): Promise<WorkspaceAccessSnapshot | null> {
    const workspaceRecord = await this.workspaceRepo.findOne({
      where: { id: params.workspaceId, orgId: params.orgId },
    });
    if (!workspaceRecord) return null;

    const [member, teamGrants] = await Promise.all([
      this.memberRepo.findOne({
        where: { workspaceId: params.workspaceId, userId: params.userId },
      }),
      this.findTeamGrants(params.workspaceId, params.teamIds),
    ]);
    const overrides = await this.findOverrides(teamGrants, params.userId);

    return {
      workspace: this.mapper.toDomain(workspaceRecord),
      directMembership: member
        ? { role: member.role, status: member.status }
        : undefined,
      teamGrants: teamGrants.map((grant) => ({
        teamId: grant.teamId,
        role: grant.role,
        override: overrides.get(grant.id),
      })),
    };
  }

  async findAccessSnapshots(
    params: FindWorkspaceAccessListParams,
    query: WorkspaceListOptions,
  ): Promise<Paginated<WorkspaceAccessSnapshot>> {
    const listQuery = this.createAccessListQuery(params, query);
    const [records, total] = await listQuery
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();
    const snapshots = await this.hydrateSnapshots(records, params);
    return new Paginated({
      data: snapshots,
      limit: query.limit,
      offset: query.offset,
      total,
    });
  }

  private createAccessListQuery(
    params: FindWorkspaceAccessListParams,
    query: WorkspaceListOptions,
  ): SelectQueryBuilder<WorkspaceRecord> {
    const builder = this.workspaceRepo
      .createQueryBuilder('workspace')
      .leftJoin('threads', 'thread', 'thread."workspaceId" = workspace.id')
      .where('workspace."orgId" = :orgId', { orgId: params.orgId })
      .andWhere(this.accessCondition(params), {
        userId: params.userId,
        visibility: WorkspaceVisibility.ORGANIZATION,
        activeStatus: WorkspaceMemberStatus.ACTIVE,
        teamIds: params.teamIds,
      })
      .groupBy('workspace.id');
    if (query.search) {
      builder.andWhere('workspace.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    this.applySort(builder, query.sort);
    return builder.addOrderBy('workspace.id', 'ASC');
  }

  private accessCondition(params: FindWorkspaceAccessListParams): string {
    const direct = `EXISTS (
      SELECT 1 FROM workspace_members member
      WHERE member."workspaceId" = workspace.id
        AND member."userId" = :userId
        AND member.status = :activeStatus
    )`;
    const sources = [
      'workspace."userId" = :userId',
      'workspace.visibility = :visibility',
      direct,
    ];
    if (params.teamIds.length > 0) {
      sources.push(`EXISTS (
        SELECT 1 FROM workspace_team_grants team_grant
        LEFT JOIN workspace_team_member_overrides member_override
          ON member_override."teamGrantId" = team_grant.id
          AND member_override."userId" = :userId
        WHERE team_grant."workspaceId" = workspace.id
          AND team_grant."teamId" IN (:...teamIds)
          AND COALESCE(member_override.excluded, false) = false
      )`);
    }
    return `(${sources.join(' OR ')})`;
  }

  private applySort(
    query: SelectQueryBuilder<WorkspaceRecord>,
    sort: WorkspaceListOptions['sort'],
  ): void {
    if (sort === 'name') {
      query.orderBy('LOWER(workspace.name)', 'ASC');
      return;
    }
    if (sort === 'createdAt') {
      query.orderBy('workspace.createdAt', 'DESC');
      return;
    }
    query
      .addSelect(
        `GREATEST(workspace."updatedAt", COALESCE(
          MAX(COALESCE(thread."lastActivityAt", thread."createdAt")),
          workspace."updatedAt"
        ))`,
        'effective_activity_at',
      )
      .orderBy('effective_activity_at', 'DESC');
  }

  private async hydrateSnapshots(
    records: WorkspaceRecord[],
    params: FindWorkspaceAccessListParams,
  ): Promise<WorkspaceAccessSnapshot[]> {
    if (records.length === 0) return [];
    const workspaceIds = records.map(({ id }) => id);
    const [members, teamGrants] = await Promise.all([
      this.memberRepo.find({
        where: { workspaceId: In(workspaceIds), userId: params.userId },
      }),
      params.teamIds.length === 0
        ? []
        : this.teamGrantRepo.find({
            where: {
              workspaceId: In(workspaceIds),
              teamId: In(params.teamIds),
            },
          }),
    ]);
    const overrides = await this.findOverrides(teamGrants, params.userId);
    return records.map((record) => ({
      workspace: this.mapper.toDomain(record),
      directMembership: this.mapMember(members, record.id),
      teamGrants: teamGrants
        .filter(({ workspaceId }) => workspaceId === record.id)
        .map((grant) => ({
          teamId: grant.teamId,
          role: grant.role,
          override: overrides.get(grant.id),
        })),
    }));
  }

  private mapMember(
    members: WorkspaceMemberRecord[],
    workspaceId: UUID,
  ): WorkspaceAccessSnapshot['directMembership'] {
    const member = members.find((record) => record.workspaceId === workspaceId);
    return member ? { role: member.role, status: member.status } : undefined;
  }

  private async findTeamGrants(
    workspaceId: UUID,
    teamIds: UUID[],
  ): Promise<WorkspaceTeamGrantRecord[]> {
    if (teamIds.length === 0) return [];
    return this.teamGrantRepo.find({
      where: { workspaceId, teamId: In(teamIds) },
    });
  }

  private async findOverrides(
    teamGrants: WorkspaceTeamGrantRecord[],
    userId: UUID,
  ): Promise<Map<UUID, TeamGrantCandidate['override']>> {
    if (teamGrants.length === 0) return new Map();
    const records = await this.overrideRepo.find({
      where: { teamGrantId: In(teamGrants.map(({ id }) => id)), userId },
    });
    return new Map(
      records.map((record) => [
        record.teamGrantId,
        { role: record.role, excluded: record.excluded },
      ]),
    );
  }
}
