import type { UUID } from 'crypto';
import type { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import type { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import { GetInviteByTokenQuery } from 'src/iam/invites/application/use-cases/get-invite-by-token/get-invite-by-token.query';
import { GetInviteByTokenUseCase } from 'src/iam/invites/application/use-cases/get-invite-by-token/get-invite-by-token.use-case';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { InviteStatus } from 'src/iam/invites/domain/invite-status.enum';
import type { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import type { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const INVITE_ID = '9bbc61a7-99ef-403d-ac44-d4c84301728c' as UUID;
const ORG_ID = '36532f02-21de-4a23-a49c-0e690fb97509' as UUID;

describe(GetInviteByTokenUseCase.name, () => {
  it('returns the token-bound organization and its authentication policy', async () => {
    const invite = new Invite({
      id: INVITE_ID,
      email: 'invitee@external.example',
      orgId: ORG_ID,
      role: UserRole.USER,
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    const invites = { findOne: jest.fn().mockResolvedValue(invite) };
    const orgs = {
      execute: jest.fn().mockResolvedValue({ id: ORG_ID, name: 'Stadt' }),
    };
    const tokens = {
      verifyInviteToken: jest.fn().mockReturnValue({ inviteId: INVITE_ID }),
    };
    const policy = {
      execute: jest
        .fn()
        .mockResolvedValue({ localPasswordLoginEnabled: false }),
    };
    const useCase = new GetInviteByTokenUseCase(
      invites as unknown as InvitesRepository,
      orgs as unknown as FindOrgByIdUseCase,
      tokens as unknown as InviteJwtService,
      policy as unknown as GetOrgAuthenticationPolicyUseCase,
    );

    await expect(
      useCase.execute(new GetInviteByTokenQuery('token')),
    ).resolves.toMatchObject({
      orgId: ORG_ID,
      organizationName: 'Stadt',
      localPasswordLoginEnabled: false,
      status: InviteStatus.PENDING,
    });
    expect(policy.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_ID }),
    );
  });
});
