import { InviteMapper } from './invite.mapper';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { InviteTeamRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite-team.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe(InviteMapper.name, () => {
  it('maps persisted invite teams into the invite', () => {
    const record = new InviteRecord();
    record.id = '11111111-1111-1111-1111-111111111111';
    record.email = 'ada@example.com';
    record.orgId = '22222222-2222-2222-2222-222222222222';
    record.role = UserRole.USER;
    record.expiresAt = new Date('2030-01-01T00:00:00.000Z');
    record.createdAt = new Date('2026-01-01T00:00:00.000Z');
    const firstTeam = new InviteTeamRecord();
    firstTeam.teamId = '33333333-3333-3333-3333-333333333333';
    const secondTeam = new InviteTeamRecord();
    secondTeam.teamId = '44444444-4444-4444-4444-444444444444';
    record.inviteTeams = [firstTeam, secondTeam];

    expect(new InviteMapper().toDomain(record).teamIds).toEqual([
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
    ]);
  });
});
