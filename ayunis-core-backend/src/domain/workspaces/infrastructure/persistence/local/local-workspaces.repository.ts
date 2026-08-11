import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceMapper } from './mappers/workspace.mapper';

@Injectable()
export class LocalWorkspacesRepository extends WorkspacesRepository {
  private readonly logger = new Logger(LocalWorkspacesRepository.name);

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
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
    });
    return records.map((record) => this.mapper.toDomain(record));
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

  async togglePinned(userId: UUID, id: UUID): Promise<boolean> {
    this.logger.log('togglePinned', { workspaceId: id });

    const rows: Array<{ isPinned: boolean }> = await this.repo.manager.query(
      `UPDATE workspaces SET "isPinned" = NOT "isPinned"
       WHERE "id" = $1 AND "userId" = $2
       RETURNING "isPinned"`,
      [id, userId],
    );

    if (rows.length === 0) {
      throw new WorkspaceNotFoundError(id);
    }
    return rows[0].isPinned;
  }

  async updateSortOrders(userId: UUID, orderedIds: UUID[]): Promise<void> {
    if (orderedIds.length === 0) {
      return;
    }
    this.logger.log('updateSortOrders', { count: orderedIds.length });

    // One statement so the new order is never partially visible, and so
    // `updatedAt` stays untouched (reordering is not an edit of the workspace).
    await this.repo.manager.query(
      `UPDATE workspaces AS w
       SET "sortOrder" = t.ordinality - 1
       FROM unnest($1::varchar[]) WITH ORDINALITY AS t(id, ordinality)
       WHERE w."id" = t.id AND w."userId" = $2`,
      [orderedIds, userId],
    );
  }
}
