import type { ClsService } from 'nestjs-cls';
import type { UUID } from 'crypto';
import type { MyClsStore } from './context.service';
import { ContextService } from './context.service';
import { UnauthorizedAccessError } from '../../errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const ORG_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000002' as UUID;
const API_KEY_ID = '00000000-0000-0000-0000-000000000003' as UUID;

function makeStore(initial: Partial<MyClsStore>): ContextService {
  const store: Partial<MyClsStore> = { ...initial };
  const cls = {
    get: <K extends keyof MyClsStore>(key: K) => store[key],
    set: <K extends keyof MyClsStore>(key: K, value: MyClsStore[K]) => {
      store[key] = value;
    },
    run: <T>(fn: () => T) => fn(),
  } as unknown as ClsService<MyClsStore>;
  return new ContextService(cls);
}

describe('ContextService', () => {
  describe('requireOrgId', () => {
    it('returns the orgId when set', () => {
      const ctx = makeStore({ orgId: ORG_ID });
      expect(ctx.requireOrgId()).toBe(ORG_ID);
    });

    it('throws UnauthorizedAccessError when missing', () => {
      const ctx = makeStore({});
      expect(() => ctx.requireOrgId()).toThrow(UnauthorizedAccessError);
    });
  });

  describe('requirePrincipal', () => {
    it('resolves a user principal', () => {
      const ctx = makeStore({
        principalKind: 'user',
        userId: USER_ID,
        orgId: ORG_ID,
        role: UserRole.ADMIN,
        systemRole: SystemRole.CUSTOMER,
      });
      expect(ctx.requirePrincipal()).toEqual({
        kind: 'user',
        userId: USER_ID,
        orgId: ORG_ID,
        role: UserRole.ADMIN,
        systemRole: SystemRole.CUSTOMER,
      });
    });

    it('resolves an api-key principal', () => {
      const ctx = makeStore({
        principalKind: 'apiKey',
        apiKeyId: API_KEY_ID,
        orgId: ORG_ID,
      });
      expect(ctx.requirePrincipal()).toEqual({
        kind: 'apiKey',
        apiKeyId: API_KEY_ID,
        orgId: ORG_ID,
      });
    });

    it('throws when no principal is set', () => {
      const ctx = makeStore({});
      expect(() => ctx.requirePrincipal()).toThrow(UnauthorizedAccessError);
    });

    it('throws when principalKind=user but userId missing', () => {
      const ctx = makeStore({
        principalKind: 'user',
        orgId: ORG_ID,
        role: UserRole.USER,
        systemRole: SystemRole.CUSTOMER,
      });
      expect(() => ctx.requirePrincipal()).toThrow(UnauthorizedAccessError);
    });

    it('throws when principalKind=apiKey but apiKeyId missing', () => {
      const ctx = makeStore({
        principalKind: 'apiKey',
        orgId: ORG_ID,
      });
      expect(() => ctx.requirePrincipal()).toThrow(UnauthorizedAccessError);
    });
  });
});
