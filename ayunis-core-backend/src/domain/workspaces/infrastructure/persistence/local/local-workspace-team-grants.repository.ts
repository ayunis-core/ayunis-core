import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  WorkspaceTeamGrantsRepository,
  type WorkspaceTeamGrant,
} from 'src/domain/workspaces/application/ports/workspace-team-grants-repository.port';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceTeamGrantMapper } from './mappers/workspace-team-grant.mapper';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';

@Injectable()
export class LocalWorkspaceTeamGrantsRepository extends WorkspaceTeamGrantsRepository {
  constructor(
    @InjectRepository(WorkspaceTeamGrantRecord)
    private readonly repository: Repository<WorkspaceTeamGrantRecord>,
    private readonly mapper: WorkspaceTeamGrantMapper,
  ) {
    super();
  }

  async createGrant(
    grant: WorkspaceTeamGrant,
  ): Promise<WorkspaceTeamGrant | null> {
    try {
      await this.repository.insert(this.mapper.toRecord(grant));
      return grant;
    } catch (error: unknown) {
      if (!this.isUniqueViolation(error)) throw error;
      return null;
    }
  }

  async updateGrantAccessLevel(
    workspaceId: UUID,
    teamId: UUID,
    accessLevel: WorkspaceAccessLevel,
  ): Promise<WorkspaceTeamGrant | null> {
    const result = await this.repository.update(
      { workspaceId, teamId },
      { accessLevel },
    );
    if (result.affected !== 1) return null;
    return { workspaceId, teamId, accessLevel };
  }

  async deleteGrant(workspaceId: UUID, teamId: UUID): Promise<boolean> {
    const result = await this.repository.delete({ workspaceId, teamId });
    return result.affected === 1;
  }

  private isUniqueViolation(error: unknown): boolean {
    const driverError = (error as { driverError?: { code?: unknown } })
      .driverError;
    return driverError?.code === '23505';
  }
}
