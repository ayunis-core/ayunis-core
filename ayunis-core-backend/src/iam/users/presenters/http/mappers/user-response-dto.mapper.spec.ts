import { randomUUID } from 'crypto';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UserResponseDtoMapper } from 'src/iam/users/presenters/http/mappers/user-response-dto.mapper';

describe(UserResponseDtoMapper.name, () => {
  const mapper = new UserResponseDtoMapper();
  const user = new User({
    id: randomUUID(),
    email: 'locked@stadt.example',
    emailVerified: true,
    passwordHash: 'hash',
    role: UserRole.USER,
    orgId: randomUUID(),
    name: 'Locked User',
    hasAcceptedMarketing: false,
    lockedAt: new Date('2026-08-24T10:00:00.000Z'),
  });

  it('omits lock status by default', () => {
    expect(mapper.toDto(user)).not.toHaveProperty('isLocked');
  });

  it('includes lock status for an authorized administrative view', () => {
    expect(mapper.toDto(user, true)).toMatchObject({ isLocked: true });
  });
});
