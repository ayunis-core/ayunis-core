import type { UUID } from 'crypto';
import type { ClsStore } from 'nestjs-cls';
import { ClsService } from 'nestjs-cls';
import { Injectable } from '@nestjs/common';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { PrincipalKind } from 'src/iam/authentication/domain/active-principal.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

export interface MyClsStore extends ClsStore {
  principalKind?: PrincipalKind;
  /** User UUID. Set only when `principalKind === 'user'`. */
  userId?: UUID;
  /** API key UUID. Set only when `principalKind === 'apiKey'`. */
  apiKeyId?: UUID;
  orgId?: UUID;
  systemRole?: SystemRole;
  role?: UserRole;
}

export type ResolvedPrincipal =
  | {
      kind: 'user';
      userId: UUID;
      orgId: UUID;
      role: UserRole;
      systemRole: SystemRole;
    }
  | {
      kind: 'apiKey';
      apiKeyId: UUID;
      orgId: UUID;
      role: UserRole;
      systemRole: SystemRole;
    };

/**
 * Request-scoped context backed by `nestjs-cls`. Wraps `ClsService` so we can
 * add domain-specific helpers like `requireOrgId()` / `requirePrincipal()`
 * without giving every use case the full `ClsService` API surface.
 */
@Injectable()
export class ContextService {
  constructor(private readonly cls: ClsService<MyClsStore>) {}

  get<K extends keyof MyClsStore>(key: K): MyClsStore[K] | undefined;
  // Legacy overload kept for callers that pass an explicit value-type generic
  // (e.g. `ctx.get<SystemRole>('systemRole')`); the keyof-typed overload above
  // is preferred for new code.
  get<T>(key: keyof MyClsStore): T | undefined;
  get(key: keyof MyClsStore): unknown {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- ClsService.get returns any
    return this.cls.get(key);
  }

  set<K extends keyof MyClsStore>(key: K, value: MyClsStore[K]): void {
    this.cls.set(key, value);
  }

  run<T>(fn: () => T): T {
    return this.cls.run(fn);
  }

  /**
   * Returns the current org id, or throws `UnauthorizedAccessError` if no
   * principal is authenticated. Use this in use cases instead of
   * `ctx.get('orgId')` + null check.
   */
  requireOrgId(): UUID {
    const orgId = this.cls.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    return orgId;
  }

  /**
   * Returns a discriminated principal from CLS context. Use this when a use
   * case needs to branch on the principal kind (user vs api key) — e.g.
   * usage attribution. Throws `UnauthorizedAccessError` if no principal is set.
   */
  requirePrincipal(): ResolvedPrincipal {
    const kind = this.cls.get('principalKind');
    const orgId = this.cls.get('orgId');
    const role = this.cls.get('role');
    const systemRole = this.cls.get('systemRole');
    if (!kind || !orgId || !role || !systemRole) {
      throw new UnauthorizedAccessError();
    }
    if (kind === 'user') {
      const userId = this.cls.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }
      return { kind: 'user', userId, orgId, role, systemRole };
    }
    const apiKeyId = this.cls.get('apiKeyId');
    if (!apiKeyId) {
      throw new UnauthorizedAccessError();
    }
    return { kind: 'apiKey', apiKeyId, orgId, role, systemRole };
  }
}
