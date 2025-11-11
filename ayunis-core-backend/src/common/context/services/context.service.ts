import { UUID } from 'crypto';
import { ClsService, ClsStore } from 'nestjs-cls';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export interface MyClsStore extends ClsStore {
  userId?: UUID;
  orgId?: UUID;
  systemRole?: SystemRole;
  role?: UserRole;
}

export class ContextService extends ClsService<MyClsStore> {}
