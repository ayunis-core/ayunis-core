import { randomUUID } from 'crypto';
import { InviteResponseMapper } from './invite-response.mapper';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { InviteStatus } from 'src/iam/invites/domain/invite-status.enum';

describe('invite team response boundaries', () => {
  const teams = [{ id: randomUUID(), name: 'Bauamt' }];
  const invite = Object.assign(
    new Invite({
      orgId: randomUUID(),
      email: 'anna@bamberg.example',
      role: UserRole.USER,
      expiresAt: new Date('2030-01-01'),
      teamIds: teams.map((team) => team.id),
    }),
    { teams },
  );
  const mapper = new InviteResponseMapper();
  it('includes team names in the private list', () => {
    const result = mapper.toPaginatedDto(
      new Paginated({ data: [invite], limit: 25, offset: 0, total: 1 }),
    );
    expect(result.data[0]).toHaveProperty('teams', teams);
  });
  it('never includes team data in public token details', () => {
    const result = mapper.toDetailDto({
      ...invite,
      sentDate: invite.createdAt,
      status: InviteStatus.PENDING,
      organizationName: 'Stadt Bamberg',
      localPasswordLoginEnabled: true,
    });
    expect(result).not.toHaveProperty('teams');
    expect(result).not.toHaveProperty('teamIds');
  });
});
