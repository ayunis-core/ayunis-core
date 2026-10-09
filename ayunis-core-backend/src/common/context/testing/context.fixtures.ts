import type { UUID } from 'crypto';
import type {
  ContextService,
  MyClsStore,
} from 'src/common/context/services/context.service';
import type { UserContext } from 'src/common/context/required-context';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

/** The named CLS keys without the `ClsStore` symbol index signature. */
type ContextStore = Pick<
  MyClsStore,
  'userId' | 'apiKeyId' | 'orgId' | 'role' | 'systemRole' | 'refreshToken'
>;

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
export const TEST_ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;

/**
 * A complete user-backed CLS store. The interceptor always sets all four keys
 * together for a user login, so a double that omits the roles models a state
 * that never occurs at runtime and makes `getRequiredUserContext` throw.
 */
export function aUserContext(
  overrides: Partial<UserContext> = {},
): UserContext {
  return {
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
    ...overrides,
  };
}

/** A `ContextService.get` implementation reading from the given store. */
export function getFromStore(store: ContextStore): (key: string) => unknown {
  return (key) => store[key as keyof ContextStore];
}

/** A `ContextService.get` implementation backed by a complete user store. */
export function getFromUserContext(
  overrides: Partial<UserContext> = {},
): (key: string) => unknown {
  return getFromStore(aUserContext(overrides));
}

export function createMockContextService(
  store: ContextStore = aUserContext(),
): jest.Mocked<ContextService> {
  return {
    get: jest.fn(getFromStore(store)),
  } as unknown as jest.Mocked<ContextService>;
}
