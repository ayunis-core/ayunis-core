import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  RolePermissionsRepository,
  type RoleGrant,
} from 'src/iam/permissions/application/ports/role-permissions.repository';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { RolePermission } from 'src/iam/permissions/domain/role-permission.entity';
import { RolePermissionRecord } from './schema/role-permission.record';
import { RolePermissionMapper } from './mappers/role-permission.mapper';

@Injectable()
export class LocalRolePermissionsRepository extends RolePermissionsRepository {
  constructor(
    @InjectRepository(RolePermissionRecord)
    private readonly repository: Repository<RolePermissionRecord>,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<RolePermission[]> {
    const records = await this.repository.find({ where: { orgId } });
    return records.map((record) => RolePermissionMapper.toDomain(record));
  }

  async existsForRole(
    orgId: UUID,
    role: UserRole,
    permission: Permission,
  ): Promise<boolean> {
    return this.repository.existsBy({ orgId, role, permission });
  }

  async setForRole(
    orgId: UUID,
    role: UserRole,
    permissions: Permission[],
  ): Promise<void> {
    await this.setForRoles(orgId, [{ role, permissions }]);
  }

  async setForRoles(orgId: UUID, grants: RoleGrant[]): Promise<void> {
    if (grants.length === 0) {
      return;
    }

    const roles = grants.map((grant) => grant.role);
    const records = grants.flatMap((grant) =>
      grant.permissions.map((permission) =>
        RolePermissionMapper.toRecord(
          new RolePermission({ orgId, role: grant.role, permission }),
        ),
      ),
    );

    await this.repository.manager.transaction(async (manager) => {
      await manager.delete(RolePermissionRecord, { orgId, role: In(roles) });
      if (records.length > 0) {
        await manager.save(records);
      }
    });
  }
}
