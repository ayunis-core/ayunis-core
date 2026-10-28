import { randomUUID } from 'crypto';
import { cleanUserData } from 'src/common/util/clean-user-data';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(cleanUserData.name, () => {
  it('does not expose account lock state', () => {
    const user = new User({
      email: 'staff@stadt.example',
      emailVerified: true,
      passwordHash: 'secret-hash',
      role: UserRole.USER,
      orgId: randomUUID(),
      name: 'Erika Mustermann',
      hasAcceptedMarketing: false,
      lockedAt: new Date('2026-08-24T10:00:00.000Z'),
    });

    const data = cleanUserData(user);

    expect(data.passwordHash).toBe('');
    expect(data).not.toHaveProperty('lockedAt');
  });
});
