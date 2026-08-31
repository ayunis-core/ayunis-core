import type { UUID } from 'crypto';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export const TEST_USER_ID = 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e' as UUID;
export const TEST_ORG_ID = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4' as UUID;

type UserParams = ConstructorParameters<typeof User>[0];

export function aUser(overrides: Partial<UserParams> = {}): User {
  return new User({
    id: TEST_USER_ID,
    email: 'test@example.com',
    emailVerified: false,
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- This is a non-secret test hash.
    passwordHash: 'hashedPassword',
    role: UserRole.USER,
    orgId: TEST_ORG_ID,
    name: 'Test User',
    hasAcceptedMarketing: false,
    ...overrides,
  });
}
