import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceUserSettingsRecord } from './schema/workspace-user-settings.record';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { isForeignKeyViolation } from './foreign-key-violation.util';

/** Never-ordered workspaces sort behind every manually placed one. */
const UNORDERED = Number.MAX_SAFE_INTEGER;

@Injectable()
export class LocalWorkspacesRepository extends WorkspacesRepository {
  private readonly logger = new Logger(LocalWorkspacesRepository.name);

  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly repo: Repository<WorkspaceRecord>,
    @InjectRepository(WorkspaceUserSettingsRecord)
    private readonly settingsRepo: Repository<WorkspaceUserSettingsRecord>,
    private readonly mapper: WorkspaceMapper,
  ) {
    super();
  }

  async findAllByUserId(userId: UUID): Promise<Workspace[]> {
    const [records, settings] = await Promise.all([
      this.repo.find({ where: { userId } }),
      this.settingsRepo.find({ where: { userId } }),
    ]);
    const settingsByWorkspace = new Map(
      settings.map((row) => [row.workspaceId, row]),
    );

    return records
      .map((record) => ({
        record,
        settings: settingsByWorkspace.get(record.id) ?? null,
      }))
      .sort((left, right) => {
        const order =
          (left.settings?.sortOrder ?? UNORDERED) -
          (right.settings?.sortOrder ?? UNORDERED);
        if (order !== 0) return order;
        return (
          right.record.updatedAt.getTime() - left.record.updatedAt.getTime()
        );
      })
      .map(({ record, settings: row }) => this.mapper.toDomain(record, row));
  }

  async findById(userId: UUID, id: UUID): Promise<Workspace | null> {
    const record = await this.repo.findOne({ where: { userId, id } });
    if (!record) return null;
    const settings = await this.settingsRepo.findOne({
      where: { workspaceId: id, userId },
    });
    return this.mapper.toDomain(record, settings);
  }

  async save(workspace: Workspace): Promise<Workspace> {
    await this.repo.save(this.mapper.toRecord(workspace));
    return workspace;
  }

  // Single statement, like togglePinned/updateSortOrders: no find-then-save
  // window, and an existing row keeps its id.
  async saveSettings(workspace: Workspace): Promise<void> {
    await this.settingsRepo.manager.query(
      `INSERT INTO workspace_user_settings ("id", "workspaceId", "userId", "isPinned", "sortOrder")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("workspaceId", "userId")
       DO UPDATE SET "isPinned" = EXCLUDED."isPinned", "sortOrder" = EXCLUDED."sortOrder"`,
      [
        randomUUID(),
        workspace.id,
        workspace.userId,
        workspace.isPinned,
        workspace.sortOrder,
      ],
    );
  }

  async delete(userId: UUID, id: UUID): Promise<void> {
    const result = await this.repo.delete({ userId, id });
    if (!result.affected) {
      throw new WorkspaceNotFoundError(id);
    }
  }

  // Callers verify workspace ownership via findById first; the FK guarantees
  // the workspace exists. Single statement so concurrent toggles cannot lose
  // an update, and the workspace row's updatedAt is never touched.
  async togglePinned(userId: UUID, id: UUID): Promise<boolean> {
    this.logger.log('togglePinned', { workspaceId: id });

    try {
      const rows: Array<{ isPinned: boolean }> =
        await this.settingsRepo.manager.query(
          `INSERT INTO workspace_user_settings ("id", "workspaceId", "userId", "isPinned")
           VALUES ($1, $2, $3, true)
           ON CONFLICT ("workspaceId", "userId")
           DO UPDATE SET "isPinned" = NOT workspace_user_settings."isPinned"
           RETURNING "isPinned"`,
          [randomUUID(), id, userId],
        );
      return rows[0].isPinned;
    } catch (error) {
      // A workspace deleted between the caller's ownership check and this
      // insert surfaces as an FK violation, not as zero returned rows.
      if (isForeignKeyViolation(error)) {
        throw new WorkspaceNotFoundError(id);
      }
      throw error;
    }
  }

  async updateSortOrders(userId: UUID, orderedIds: UUID[]): Promise<void> {
    if (orderedIds.length === 0) {
      return;
    }
    this.logger.log('updateSortOrders', { count: orderedIds.length });

    // One statement so the new order is never partially visible. Rows are
    // created on demand for workspaces the user never pinned or ordered.
    await this.settingsRepo.manager.query(
      `INSERT INTO workspace_user_settings ("id", "workspaceId", "userId", "sortOrder")
       SELECT (gen_random_uuid())::character varying, t.id, $2, t.ordinality - 1
       FROM unnest($1::character varying[]) WITH ORDINALITY AS t(id, ordinality)
       ON CONFLICT ("workspaceId", "userId")
       DO UPDATE SET "sortOrder" = EXCLUDED."sortOrder"`,
      [orderedIds, userId],
    );
  }
}
