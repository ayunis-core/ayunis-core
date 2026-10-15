import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { In, type EntityManager, type Repository } from 'typeorm';
import { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import {
  WorkspaceSharing,
  type TeamGrant,
  type TeamOverride,
} from 'src/domain/workspaces/domain/workspace-sharing';
import type { WorkspaceGrantLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceAccessPersonRecord } from './schema/workspace-access-person.record';
import { WorkspaceAccessTeamRecord } from './schema/workspace-access-team.record';
import { WorkspaceAccessTeamOverrideRecord } from './schema/workspace-access-team-override.record';
import { WorkspaceAccessOrgExclusionRecord } from './schema/workspace-access-org-exclusion.record';

interface SharingRows {
  people: WorkspaceAccessPersonRecord[];
  teams: WorkspaceAccessTeamRecord[];
  overrides: WorkspaceAccessTeamOverrideRecord[];
  exclusions: WorkspaceAccessOrgExclusionRecord[];
}

@Injectable()
export class LocalWorkspaceSharingRepository extends WorkspaceSharingRepository {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly defaultWorkspaces: Repository<WorkspaceRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get manager(): EntityManager {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.defaultWorkspaces.manager;
  }

  async loadMany(
    workspaces: Workspace[],
  ): Promise<Map<UUID, WorkspaceSharing>> {
    if (workspaces.length === 0) return new Map();
    const rows = await this.findRows(workspaces.map(({ id }) => id));
    return new Map(
      workspaces.map((workspace) => [
        workspace.id,
        this.toSharing(workspace, rows),
      ]),
    );
  }

  async save(sharing: WorkspaceSharing): Promise<void> {
    const { workspaceId } = sharing;
    const manager = this.manager;
    await Promise.all(
      [
        WorkspaceAccessTeamOverrideRecord,
        WorkspaceAccessPersonRecord,
        WorkspaceAccessOrgExclusionRecord,
      ].map((record) => manager.delete(record, { workspaceId })),
    );
    await manager.delete(WorkspaceAccessTeamRecord, { workspaceId });
    await manager.update(
      WorkspaceRecord,
      { id: workspaceId },
      { isSharedWithOrganization: sharing.isSharedWithOrganization },
    );
    await this.insertPeople(manager, sharing);
    await this.insertTeams(manager, sharing);
    await this.insertExclusions(manager, sharing);
  }

  private async findRows(workspaceIds: UUID[]): Promise<SharingRows> {
    const where = { workspaceId: In(workspaceIds) };
    const manager = this.manager;
    const [people, teams, overrides, exclusions] = await Promise.all([
      manager.find(WorkspaceAccessPersonRecord, { where }),
      manager.find(WorkspaceAccessTeamRecord, { where }),
      manager.find(WorkspaceAccessTeamOverrideRecord, { where }),
      manager.find(WorkspaceAccessOrgExclusionRecord, { where }),
    ]);
    return { people, teams, overrides, exclusions };
  }

  private toSharing(workspace: Workspace, rows: SharingRows): WorkspaceSharing {
    const ofWorkspace = <T extends { workspaceId: UUID }>(items: T[]) =>
      items.filter((item) => item.workspaceId === workspace.id);
    return new WorkspaceSharing({
      workspaceId: workspace.id,
      ownerId: workspace.userId,
      isSharedWithOrganization: workspace.isSharedWithOrganization,
      people: new Map(
        ofWorkspace(rows.people).map((row) => [row.userId, row.accessLevel]),
      ),
      teams: ofWorkspace(rows.teams).map((row) =>
        this.toTeamGrant(row, rows.overrides),
      ),
      organizationExclusions: new Set(
        ofWorkspace(rows.exclusions).map(({ userId }) => userId),
      ),
    });
  }

  private toTeamGrant(
    row: WorkspaceAccessTeamRecord,
    overrides: WorkspaceAccessTeamOverrideRecord[],
  ): TeamGrant {
    return {
      teamId: row.teamId,
      level: row.accessLevel,
      grantedAt: row.grantedAt,
      overrides: new Map(
        overrides
          .filter(({ teamGrantId }) => teamGrantId === row.id)
          .map((override) => [override.userId, this.toOverride(override)]),
      ),
    };
  }

  private toOverride(row: WorkspaceAccessTeamOverrideRecord): TeamOverride {
    return row.excluded || row.accessLevel === null
      ? { excluded: true }
      : { excluded: false, level: row.accessLevel };
  }

  private async insertPeople(
    manager: EntityManager,
    sharing: WorkspaceSharing,
  ): Promise<void> {
    const people = [...sharing.people].map(([userId, accessLevel]) =>
      manager.create(WorkspaceAccessPersonRecord, {
        id: randomUUID(),
        workspaceId: sharing.workspaceId,
        userId,
        accessLevel,
      }),
    );
    if (people.length > 0)
      await manager.insert(WorkspaceAccessPersonRecord, people);
  }

  private async insertTeams(
    manager: EntityManager,
    sharing: WorkspaceSharing,
  ): Promise<void> {
    for (const grant of sharing.teams) {
      const teamGrantId = randomUUID();
      await manager.insert(WorkspaceAccessTeamRecord, {
        id: teamGrantId,
        workspaceId: sharing.workspaceId,
        teamId: grant.teamId,
        accessLevel: grant.level,
        grantedAt: grant.grantedAt,
      });
      const overrides = [...grant.overrides].map(([userId, override]) => ({
        id: randomUUID(),
        teamGrantId,
        workspaceId: sharing.workspaceId,
        userId,
        excluded: override.excluded,
        accessLevel: override.excluded
          ? null
          : (override.level satisfies WorkspaceGrantLevel),
      }));
      if (overrides.length > 0) {
        await manager.insert(WorkspaceAccessTeamOverrideRecord, overrides);
      }
    }
  }

  private async insertExclusions(
    manager: EntityManager,
    sharing: WorkspaceSharing,
  ): Promise<void> {
    const exclusions = [...sharing.organizationExclusions].map((userId) => ({
      id: randomUUID(),
      workspaceId: sharing.workspaceId,
      userId,
    }));
    if (exclusions.length > 0) {
      await manager.insert(WorkspaceAccessOrgExclusionRecord, exclusions);
    }
  }
}
