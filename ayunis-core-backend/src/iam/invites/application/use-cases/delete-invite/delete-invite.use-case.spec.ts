import type { UUID } from 'crypto';
import type { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteNotFoundError } from 'src/iam/invites/application/invites.errors';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { DeleteInviteCommand } from './delete-invite.command';
import { DeleteInviteUseCase } from './delete-invite.use-case';

describe(DeleteInviteUseCase.name, () => {
  const inviteId = '11111111-1111-4111-8111-111111111111' as UUID;
  const orgId = '44444444-4444-4444-8444-444444444444' as UUID;
  const otherOrgId = '55555555-5555-4555-8555-555555555555' as UUID;

  function setup(invite: Invite | null) {
    const remainingInvites = invite ? [invite] : [];
    const invitesRepository = {
      deletePendingByIdAndOrg: async (id: UUID, selectedOrgId: UUID) => {
        const index = remainingInvites.findIndex(
          (candidate) =>
            candidate.id === id &&
            candidate.orgId === selectedOrgId &&
            !candidate.acceptedAt,
        );
        if (index === -1) return false;
        remainingInvites.splice(index, 1);
        return true;
      },
    };
    const useCase = new DeleteInviteUseCase(
      invitesRepository as unknown as InvitesRepository,
    );
    return { useCase, remainingInvites };
  }

  function inviteOf(inviteOrgId: UUID): Invite {
    return new Invite({
      id: inviteId,
      email: 'user@example.com',
      orgId: inviteOrgId,
      role: UserRole.USER,
      expiresAt: new Date(Date.now() + 60_000),
    });
  }

  it('deletes an invite of the caller organization', async () => {
    const { useCase, remainingInvites } = setup(inviteOf(orgId));

    await useCase.execute(new DeleteInviteCommand({ inviteId, orgId }));

    expect(remainingInvites).toEqual([]);
  });

  it('reports an invite of another organization as not found and keeps it', async () => {
    const { useCase, remainingInvites } = setup(inviteOf(otherOrgId));

    await expect(
      useCase.execute(new DeleteInviteCommand({ inviteId, orgId })),
    ).rejects.toBeInstanceOf(InviteNotFoundError);
    expect(remainingInvites).toHaveLength(1);
  });

  it('preserves accepted invitations', async () => {
    const invite = inviteOf(orgId);
    invite.acceptedAt = new Date();
    const { useCase, remainingInvites } = setup(invite);

    await expect(
      useCase.execute(new DeleteInviteCommand({ inviteId, orgId })),
    ).rejects.toBeInstanceOf(InviteNotFoundError);
    expect(remainingInvites).toHaveLength(1);
  });

  it('reports a missing invite as not found', async () => {
    const { useCase, remainingInvites } = setup(null);

    await expect(
      useCase.execute(new DeleteInviteCommand({ inviteId, orgId })),
    ).rejects.toBeInstanceOf(InviteNotFoundError);
    expect(remainingInvites).toEqual([]);
  });
});
