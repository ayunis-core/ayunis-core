import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

@Entity({ name: 'role_permissions' })
@Unique(['orgId', 'role', 'permission'])
export class RolePermissionRecord extends BaseRecord {
  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: Permission })
  permission: Permission;
}
