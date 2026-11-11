import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';

@Injectable()
export class LocalWorkspaceMembersRepository extends WorkspaceMembersRepository {
  constructor(
    @InjectRepository(WorkspaceMemberRecord)
    private readonly defaultRepo: Repository<WorkspaceMemberRecord>,
    private readonly mapper: WorkspaceMemberMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repo(): Repository<WorkspaceMemberRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(WorkspaceMemberRecord) ?? this.defaultRepo;
  }

  async create(member: WorkspaceMember): Promise<WorkspaceMember> {
    await this.repo.insert(this.mapper.toRecord(member));
    return member;
  }

  async findWorkspaceIdsByUserId(userId: UUID): Promise<UUID[]> {
    const records = await this.repo.find({
      where: { userId },
      select: { workspaceId: true },
    });
    return records.map((record) => record.workspaceId);
  }

  async findRole(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<UserRole | null> {
    const record = await this.repo
      .createQueryBuilder('member')
      .innerJoin(
        WorkspaceRecord,
        'workspace',
        'workspace.id = member.workspaceId',
      )
      .select('member.role', 'role')
      .where('member.workspaceId = :workspaceId', { workspaceId })
      .andWhere('member.userId = :userId', { userId })
      .andWhere('workspace.orgId = :orgId', { orgId })
      .getRawOne<{ role: UserRole }>();
    return record?.role ?? null;
  }

  async findRolesByUserId(
    userId: UUID,
    workspaceIds: UUID[],
  ): Promise<Map<UUID, UserRole>> {
    if (workspaceIds.length === 0) return new Map();
    const records = await this.repo.find({
      where: { userId, workspaceId: In(workspaceIds) },
      select: { workspaceId: true, role: true },
    });
    return new Map(records.map((record) => [record.workspaceId, record.role]));
  }

  async promoteSuccessors(workspaceIds: UUID[]): Promise<void> {
    if (workspaceIds.length === 0) return;
    await this.repo.manager.transaction(async (manager) => {
      await manager.query(
        `SELECT "id" FROM "workspaces" WHERE "id" = ANY($1) ORDER BY "id" FOR UPDATE`,
        [workspaceIds],
      );
      await manager.query(
        `UPDATE "workspace_members" SET "role" = 'admin', "updatedAt" = now()
         WHERE "id" IN (
           SELECT DISTINCT ON ("candidate"."workspaceId") "candidate"."id"
           FROM "workspace_members" "candidate"
           WHERE "candidate"."workspaceId" = ANY($1)
             AND NOT EXISTS (
               SELECT 1 FROM "workspace_members" "admin"
               WHERE "admin"."workspaceId" = "candidate"."workspaceId"
                 AND "admin"."role" = 'admin'
             )
           ORDER BY "candidate"."workspaceId", "candidate"."createdAt", "candidate"."id"
         )`,
        [workspaceIds],
      );
    });
  }
}
