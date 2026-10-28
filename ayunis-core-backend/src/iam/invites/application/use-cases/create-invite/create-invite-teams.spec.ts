import { FindTeamsByIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-ids-and-org-id/find-teams-by-ids-and-org-id.use-case';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CreateInviteUseCase } from './create-invite.use-case';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { SendInvitationEmailUseCase } from 'src/iam/invites/application/use-cases/send-invitation-email/send-invitation-email.use-case';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { TeamNotFoundError } from 'src/iam/teams/application/teams.errors';

describe('single invite team assignments', () => {
  const orgId = randomUUID();
  const teamId = randomUUID();
  const create = jest.fn();
  let useCase: CreateInviteUseCase;
  beforeEach(async () => {
    create.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        CreateInviteUseCase,
        {
          provide: FindTeamsByIdsAndOrgIdUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue([{ id: teamId, name: 'Bauamt', orgId }]),
          },
        },
        {
          provide: InvitesRepository,
          useValue: {
            create,
            findOneByEmail: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: InviteJwtService,
          useValue: { generateInviteToken: () => 'token' },
        },
        { provide: GetActiveSubscriptionUseCase, useValue: {} },
        { provide: UpdateSeatsUseCase, useValue: {} },
        { provide: SendInvitationEmailUseCase, useValue: {} },
        {
          provide: FindUserByEmailUseCase,
          useValue: { execute: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string): unknown =>
              ({
                'auth.emailProviderBlacklist': [],
                'auth.jwt.inviteExpiresIn': '7d',
                'app.isCloudHosted': false,
              })[key as 'app.isCloudHosted'],
          },
        },
      ],
    }).compile();
    useCase = module.get(CreateInviteUseCase);
  });
  function command(teamIds?: ReturnType<typeof randomUUID>[]) {
    return {
      email: 'anna@bamberg.example',
      orgId,
      userId: randomUUID(),
      role: UserRole.USER,
      teamIds,
    };
  }
  it('persists unique selected teams on a single invite', async () => {
    const result = await useCase.execute(command([teamId, teamId]));
    expect(result.invite.teamIds).toEqual([teamId]);
  });
  it('rejects an unknown or foreign team before writing an invite', async () => {
    await expect(
      useCase.execute(command([randomUUID()])),
    ).rejects.toBeInstanceOf(TeamNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });
  it.each([undefined, []])(
    'allows an invite with no team selection: %s',
    async (teamIds) => {
      const result = await useCase.execute(command(teamIds));
      expect(result.invite.teamIds).toEqual([]);
    },
  );
});
