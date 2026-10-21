import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import type { TeamAccessService } from 'src/iam/teams/application/services/team-access.service';
import { LastTeamAdminError } from 'src/iam/teams/application/team-members.errors';
import { LastTeamAdminPolicy } from './last-team-admin-policy.service';

describe('LastTeamAdminPolicy', () => {
  const teamId = randomUUID();
  const userId = randomUUID();
  let adminIds: UUID[];
  let orgAdmin: boolean;
  let lock: jest.Mock;
  let policy: LastTeamAdminPolicy;

  beforeEach(() => {
    adminIds = [];
    orgAdmin = false;
    lock = jest.fn(() => Promise.resolve(adminIds));
    policy = new LastTeamAdminPolicy(
      { lockTeamAdminUserIds: lock } as unknown as TeamMembersRepository,
      {
        mayChangeLastTeamAdmin: () => orgAdmin,
      } as unknown as TeamAccessService,
    );
  });

  it('refuses to take the role from the only team admin', async () => {
    adminIds = [userId];

    await expect(policy.assertMayLoseAdmin({ teamId, userId })).rejects.toThrow(
      LastTeamAdminError,
    );
  });

  it('allows it while another team admin remains', async () => {
    adminIds = [userId, randomUUID()];

    await expect(
      policy.assertMayLoseAdmin({ teamId, userId }),
    ).resolves.toBeUndefined();
  });

  it('ignores plain members', async () => {
    adminIds = [randomUUID()];

    await expect(
      policy.assertMayLoseAdmin({ teamId, userId }),
    ).resolves.toBeUndefined();
  });

  it('lets organization admins change the last team admin without locking', async () => {
    adminIds = [userId];
    orgAdmin = true;

    await expect(
      policy.assertMayLoseAdmin({ teamId, userId }),
    ).resolves.toBeUndefined();
    expect(lock).not.toHaveBeenCalled();
  });
});
