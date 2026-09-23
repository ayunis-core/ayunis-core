import type { UUID } from 'crypto';
import { AcceptPendingInviteCommand } from './accept-pending-invite.command';
import { AcceptPendingInviteUseCase } from './accept-pending-invite.use-case';
import type { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteAlreadyAcceptedError } from 'src/iam/invites/application/invites.errors';

describe(AcceptPendingInviteUseCase.name, () => {
  const inviteId = '11111111-1111-1111-1111-111111111111' as UUID;
  let invites: jest.Mocked<InvitesRepository>;
  let useCase: AcceptPendingInviteUseCase;

  beforeEach(() => {
    invites = {
      accept: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<InvitesRepository>;
    useCase = new AcceptPendingInviteUseCase(invites);
  });

  it('accepts the pending invite', async () => {
    await useCase.execute(new AcceptPendingInviteCommand(inviteId));

    expect(invites.accept).toHaveBeenCalledWith(inviteId);
  });

  it('rejects an invite that was already accepted', async () => {
    invites.accept.mockResolvedValue(false);

    await expect(
      useCase.execute(new AcceptPendingInviteCommand(inviteId)),
    ).rejects.toBeInstanceOf(InviteAlreadyAcceptedError);
  });
});
