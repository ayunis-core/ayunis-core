import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type {
  ContextService,
  MyClsStore,
} from 'src/common/context/services/context.service';
import {
  getRequiredOrgId,
  getRequiredUserContext,
  getUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const API_KEY_ID = '33333333-3333-4333-8333-333333333333' as UUID;

const USER_STORE: MyClsStore = {
  userId: USER_ID,
  orgId: ORG_ID,
  role: UserRole.ADMIN,
  systemRole: SystemRole.SUPER_ADMIN,
};

function contextWith(store: MyClsStore): ContextService {
  return {
    get: (key: keyof MyClsStore) => store[key],
  } as unknown as ContextService;
}

describe('getUserContext', () => {
  it('returns the ids and roles of a user principal', () => {
    expect(getUserContext(contextWith(USER_STORE))).toEqual({
      userId: USER_ID,
      orgId: ORG_ID,
      role: UserRole.ADMIN,
      systemRole: SystemRole.SUPER_ADMIN,
    });
  });

  it('returns undefined for an api-key principal even if roles leaked into the store', () => {
    const context = contextWith({
      apiKeyId: API_KEY_ID,
      orgId: ORG_ID,
      role: UserRole.ADMIN,
      systemRole: SystemRole.SUPER_ADMIN,
    });

    expect(getUserContext(context)).toBeUndefined();
  });

  it('returns undefined for an org-only background context', () => {
    expect(getUserContext(contextWith({ orgId: ORG_ID }))).toBeUndefined();
  });

  it.each(['userId', 'orgId', 'role', 'systemRole'] as const)(
    'returns undefined when %s is missing',
    (key) => {
      const context = contextWith({ ...USER_STORE, [key]: undefined });

      expect(getUserContext(context)).toBeUndefined();
    },
  );
});

describe('getRequiredUserContext', () => {
  it('returns the ids and roles of a user principal', () => {
    expect(getRequiredUserContext(contextWith(USER_STORE))).toEqual({
      userId: USER_ID,
      orgId: ORG_ID,
      role: UserRole.ADMIN,
      systemRole: SystemRole.SUPER_ADMIN,
    });
  });

  it.each(['userId', 'orgId', 'role', 'systemRole'] as const)(
    'throws UnauthorizedAccessError when %s is missing',
    (key) => {
      const context = contextWith({ ...USER_STORE, [key]: undefined });

      expect(() => getRequiredUserContext(context)).toThrow(
        UnauthorizedAccessError,
      );
    },
  );

  it('throws UnauthorizedAccessError for an api-key principal', () => {
    const context = contextWith({ apiKeyId: API_KEY_ID, orgId: ORG_ID });

    expect(() => getRequiredUserContext(context)).toThrow(
      UnauthorizedAccessError,
    );
  });
});

describe('getRequiredOrgId', () => {
  it('returns the organization id for a user principal', () => {
    expect(getRequiredOrgId(contextWith(USER_STORE))).toBe(ORG_ID);
  });

  it('returns the organization id for an api-key principal', () => {
    const context = contextWith({ apiKeyId: API_KEY_ID, orgId: ORG_ID });

    expect(getRequiredOrgId(context)).toBe(ORG_ID);
  });

  it('throws UnauthorizedAccessError when orgId is missing', () => {
    const context = contextWith({ userId: USER_ID });

    expect(() => getRequiredOrgId(context)).toThrow(UnauthorizedAccessError);
  });
});

describe('isSuperAdmin', () => {
  it('is true for a super-admin user', () => {
    expect(isSuperAdmin(contextWith(USER_STORE))).toBe(true);
  });

  it('is false for a customer user', () => {
    const context = contextWith({
      ...USER_STORE,
      systemRole: SystemRole.CUSTOMER,
    });

    expect(isSuperAdmin(context)).toBe(false);
  });

  it('is false for an api-key principal even if the role leaked into the store', () => {
    const context = contextWith({
      apiKeyId: API_KEY_ID,
      orgId: ORG_ID,
      systemRole: SystemRole.SUPER_ADMIN,
    });

    expect(isSuperAdmin(context)).toBe(false);
  });
});
