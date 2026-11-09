import type { UUID } from 'crypto';
import type { ClsStore } from 'nestjs-cls';
import { ClsService } from 'nestjs-cls';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export interface MyClsStore extends ClsStore {
  userId?: UUID;
  apiKeyId?: UUID;
  orgId?: UUID;
  systemRole?: SystemRole;
  role?: UserRole;
  refreshToken?: string;
  /** The token client of the request's session; unset for browser sessions. */
  client?: SessionClient;
}

export class ContextService extends ClsService<MyClsStore> {}
