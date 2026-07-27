import { RolePermission } from 'src/iam/permissions/domain/role-permission.entity';
import { RolePermissionRecord } from '../schema/role-permission.record';

export class RolePermissionMapper {
  static toDomain(record: RolePermissionRecord): RolePermission {
    return new RolePermission({
      id: record.id,
      orgId: record.orgId,
      role: record.role,
      permission: record.permission,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: RolePermission): RolePermissionRecord {
    const record = new RolePermissionRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.role = domain.role;
    record.permission = domain.permission;
    return record;
  }
}
