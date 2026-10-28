import { randomUUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UserMapper } from 'src/iam/users/infrastructure/repositories/local/mappers/user.mapper';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

describe(UserMapper.name, () => {
  it('reads lock state without writing stale lockout fields', () => {
    const windowStartedAt = new Date('2026-08-24T09:45:00.000Z');
    const lockedAt = new Date('2026-08-24T10:00:00.000Z');
    const record = Object.assign(new UserRecord(), {
      id: randomUUID(),
      email: 'maria.muster@stadt-koeln.de',
      emailVerified: true,
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      orgId: randomUUID(),
      name: 'Maria Muster',
      hasAcceptedMarketing: false,
      createdAt: new Date('2026-08-01T08:00:00.000Z'),
      updatedAt: new Date('2026-08-24T10:00:00.000Z'),
      failedLoginAttempts: 10,
      failedLoginWindowStartedAt: windowStartedAt,
      lockedAt,
    });

    const domain = UserMapper.toDomain(record);
    const mappedRecord = UserMapper.toEntity(domain);

    expect(domain.lockedAt).toEqual(lockedAt);
    expect(mappedRecord.failedLoginAttempts).toBeUndefined();
    expect(mappedRecord.failedLoginWindowStartedAt).toBeUndefined();
    expect(mappedRecord.lockedAt).toBeUndefined();
  });
});
