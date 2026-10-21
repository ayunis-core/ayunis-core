import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { TeamAdminPermissionsRepository } from 'src/iam/permissions/application/ports/team-admin-permissions.repository';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { TeamAdminPermissionRecord } from 'src/iam/permissions/infrastructure/persistence/local/schema/team-admin-permission.record';

@Injectable()
export class LocalTeamAdminPermissionsRepository extends TeamAdminPermissionsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private runInTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (this.txHost.isTransactionActive()) {
      return work(this.txHost.tx);
    }
    return this.dataSource.transaction(work);
  }

  async findByOrgId(orgId: UUID): Promise<TeamAdminPermission[]> {
    const records = await this.txHost.tx
      .getRepository(TeamAdminPermissionRecord)
      .find({ where: { orgId } });
    return records.map((record) => record.permission);
  }

  async setForOrg(
    orgId: UUID,
    permissions: readonly TeamAdminPermission[],
  ): Promise<void> {
    const records = permissions.map((permission) => {
      const record = new TeamAdminPermissionRecord();
      record.id = randomUUID();
      record.orgId = orgId;
      record.permission = permission;
      return record;
    });

    await this.runInTransaction(async (manager) => {
      await manager.delete(TeamAdminPermissionRecord, { orgId });
      if (records.length > 0) {
        await manager.save(records);
      }
    });
  }
}
