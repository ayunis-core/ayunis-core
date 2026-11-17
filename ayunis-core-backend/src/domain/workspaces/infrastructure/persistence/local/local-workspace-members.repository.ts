import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { WorkspaceMemberMapper } from './mappers/workspace-member.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';

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
