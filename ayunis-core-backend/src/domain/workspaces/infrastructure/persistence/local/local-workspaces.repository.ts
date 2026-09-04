import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID, type UUID } from 'crypto';
import {
  WorkspacesRepository,
  type WorkspaceContextRefs,
  type WorkspaceThreadStats,
} from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceRecord } from './schema/workspace.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { WorkspaceSourceAssignmentRecord } from './schema/workspace-source-assignment.record';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type {
  WorkspaceListOptions,
  WorkspaceSortKey,
} from 'src/domain/workspaces/application/ports/workspaces-repository.port';

@Injectable()
export class LocalWorkspacesRepository extends WorkspacesRepository {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly repo: Repository<WorkspaceRecord>,
    @InjectRepository(SkillRecord)
    private readonly skillsRepo: Repository<SkillRecord>,
    @InjectRepository(KnowledgeBaseRecord)
    private readonly knowledgeBasesRepo: Repository<KnowledgeBaseRecord>,
    @InjectRepository(WorkspaceSourceAssignmentRecord)
    private readonly sourceAssignmentsRepo: Repository<WorkspaceSourceAssignmentRecord>,
    private readonly mapper: WorkspaceMapper,
  ) {
    super();
  }

  async findAllByUserId(
    userId: UUID,
    query: WorkspaceListOptions,
  ): Promise<Paginated<Workspace>> {
    const countQuery = this.createWorkspaceCountQuery(userId, query);
    const listQuery = this.createWorkspaceListQuery(userId, query);

    const [records, total] = await Promise.all([
      listQuery
        .addOrderBy('workspace.id', 'ASC')
        .skip(query.offset)
        .take(query.limit)
        .getMany(),
      countQuery.getCount(),
    ]);

    return new Paginated({
      data: records.map((record) => this.mapper.toDomain(record)),
      limit: query.limit,
      offset: query.offset,
      total,
    });
  }

  private createWorkspaceCountQuery(
    userId: UUID,
    query: Pick<WorkspaceListOptions, 'search'>,
  ): SelectQueryBuilder<WorkspaceRecord> {
    const countQuery = this.repo
      .createQueryBuilder('workspace')
      .where('workspace.userId = :userId', { userId });
    this.applyWorkspaceSearch(countQuery, query.search);
    return countQuery;
  }

  private createWorkspaceListQuery(
    userId: UUID,
    query: Pick<WorkspaceListOptions, 'search' | 'sort'>,
  ): SelectQueryBuilder<WorkspaceRecord> {
    const listQuery = this.repo
      .createQueryBuilder('workspace')
      .leftJoin('threads', 'thread', 'thread."workspaceId" = workspace.id')
      .where('workspace.userId = :userId', { userId })
      .addGroupBy('workspace.id');

    this.applyWorkspaceSearch(listQuery, query.search);
    this.applyWorkspaceSort(listQuery, query.sort);
    return listQuery;
  }

  private applyWorkspaceSearch(
    query: SelectQueryBuilder<WorkspaceRecord>,
    search?: string,
  ): void {
    if (search) {
      query.andWhere('workspace.name ILIKE :search', {
        search: `%${search}%`,
      });
    }
  }

  private applyWorkspaceSort(
    query: SelectQueryBuilder<WorkspaceRecord>,
    sort: WorkspaceSortKey,
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
        `GREATEST(
           workspace."updatedAt",
           COALESCE(
             MAX(COALESCE(thread."lastActivityAt", thread."createdAt")),
             workspace."updatedAt"
           )
         )`,
        'effective_activity_at',
      )
      .orderBy('effective_activity_at', 'DESC');
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

  async attachSource(workspaceId: UUID, sourceId: UUID): Promise<void> {
    await this.sourceAssignmentsRepo
      .createQueryBuilder()
      .insert()
      .values({ id: randomUUID(), workspaceId, sourceId })
      .orIgnore()
      .execute();
  }

  async getContextRefs(workspaceId: UUID): Promise<WorkspaceContextRefs> {
    const [skills, knowledgeBases, sourceAssignments] = await Promise.all([
      this.skillsRepo.find({ where: { workspaceId }, select: { id: true } }),
      this.knowledgeBasesRepo.find({ where: { workspaceId } }),
      this.sourceAssignmentsRepo.find({ where: { workspaceId } }),
    ]);

    return {
      skillIds: skills.map((skill) => skill.id),
      knowledgeBases: knowledgeBases.map((knowledgeBase) => ({
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        description: knowledgeBase.description,
        documentCount: 0,
      })),
      sourceIds: sourceAssignments.map((assignment) => assignment.sourceId),
    };
  }

  async delete(userId: UUID, id: UUID): Promise<UUID[]> {
    return this.repo.manager.transaction(async (manager) => {
      const workspaces: Array<{ id: UUID }> = await manager.query(
        `SELECT id FROM workspaces WHERE id = $1 AND "userId" = $2 FOR UPDATE`,
        [id, userId],
      );
      if (workspaces.length === 0) throw new WorkspaceNotFoundError(id);

      const sourceRows: Array<{ sourceId: UUID }> = await manager.query(
        `DELETE FROM workspace_source_assignments
         WHERE "workspaceId" = $1
         RETURNING "sourceId"`,
        [id],
      );
      await manager.delete(WorkspaceRecord, { id });
      return sourceRows.map((row) => row.sourceId);
    });
  }
}
