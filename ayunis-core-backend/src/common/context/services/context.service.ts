import type { UUID } from 'crypto';
import type { ClsStore } from 'nestjs-cls';
import { ClsService } from 'nestjs-cls';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export interface MyClsStore extends ClsStore {
  userId?: UUID;
  orgId?: UUID;
  systemRole?: SystemRole;
  role?: UserRole;
}

export class ContextService extends ClsService<MyClsStore> {}
