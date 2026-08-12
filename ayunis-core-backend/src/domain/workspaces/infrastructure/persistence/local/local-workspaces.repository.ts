import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import {
  WorkspacesRepository,
  type WorkspaceThreadStats,
} from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { In, Repository } from 'typeorm';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceRecord } from './schema/workspace.record';

@Injectable()
export class LocalWorkspacesRepository extends WorkspacesRepository {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly repo: Repository<WorkspaceRecord>,
    private readonly mapper: WorkspaceMapper,
  ) {
    super();
  }

  async findAllByUserId(userId: UUID): Promise<Workspace[]> {
    const records = await this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllByIds(userId: UUID, ids: UUID[]): Promise<Workspace[]> {
    if (ids.length === 0) return [];
    const records = await this.repo.find({ where: { userId, id: In(ids) } });
    return records.map((record) => this.mapper.toDomain(record));
  }

  // Read-only seam onto the threads table by name. Importing the threads
  // module here would reverse the threads → workspaces dependency and close a
  // cycle, so this aggregate query stays raw SQL instead.
  async getThreadStats(
    workspaceIds: UUID[],
  ): Promise<Map<UUID, WorkspaceThreadStats>> {
    if (workspaceIds.length === 0) {
      return new Map();
    }
    const rows: Array<{
      workspaceId: UUID;
      chatCount: number;
      lastActivityAt: Date | null;
    }> = await this.repo.manager.query(
      `SELECT "workspaceId",
              COUNT(*)::int AS "chatCount",
              MAX(COALESCE("lastActivityAt", "createdAt")) AS "lastActivityAt"
       FROM threads
       WHERE "workspaceId" = ANY($1)
       GROUP BY "workspaceId"`,
      [workspaceIds],
    );
    return new Map(
      rows.map((row) => [
        row.workspaceId,
        { chatCount: row.chatCount, lastActivityAt: row.lastActivityAt },
      ]),
    );
  }

  async findById(userId: UUID, id: UUID): Promise<Workspace | null> {
    const record = await this.repo.findOne({ where: { userId, id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async save(workspace: Workspace): Promise<Workspace> {
    const saved = await this.repo.save(this.mapper.toRecord(workspace));
    return this.mapper.toDomain(saved);
  }

  async delete(userId: UUID, id: UUID): Promise<void> {
    const result = await this.repo.delete({ userId, id });
    if (!result.affected) {
      throw new WorkspaceNotFoundError(id);
    }
  }
}
