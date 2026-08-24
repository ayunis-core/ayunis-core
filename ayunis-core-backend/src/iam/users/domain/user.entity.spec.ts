import { randomUUID } from 'crypto';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(User.name, () => {
  it('starts with an unlocked account', () => {
    const user = buildUser();

    expect(user.lockedAt).toBeNull();
  });

  it('reports an account with a lock timestamp as locked', () => {
    const lockedAt = new Date('2026-08-24T10:00:00.000Z');
    const user = new User({
      ...buildUserParams(),
      lockedAt,
    });

    expect(user.lockedAt).toEqual(lockedAt);
  });
});

function buildUser(): User {
  return new User(buildUserParams());
}

function buildUserParams() {
  return {
    email: 'maria.muster@stadt-koeln.de',
    emailVerified: true,
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    orgId: randomUUID(),
    name: 'Maria Muster',
    hasAcceptedMarketing: false,
  };
}
