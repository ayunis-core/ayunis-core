import type { UUID } from 'crypto';
import { Invite } from './invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(Invite.name, () => {
  it('keeps the unique teams selected for the invited user', () => {
    const researchId = '11111111-1111-1111-1111-111111111111' as UUID;
    const operationsId = '22222222-2222-2222-2222-222222222222' as UUID;

    const invite = new Invite({
      email: 'ada@example.com',
      orgId: '33333333-3333-3333-3333-333333333333',
      role: UserRole.USER,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      teamIds: [researchId, operationsId, researchId],
    });

    expect(invite.teamIds).toEqual([researchId, operationsId]);
  });

  it('defaults to no teams for existing invitation flows', () => {
    const invite = new Invite({
      email: 'grace@example.com',
      orgId: '33333333-3333-3333-3333-333333333333',
      role: UserRole.USER,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    expect(invite.teamIds).toEqual([]);
  });
});
