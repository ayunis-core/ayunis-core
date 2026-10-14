import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import type { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import { InviteNotFoundError } from 'src/iam/invites/application/invites.errors';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ResendExpiredInviteCommand } from './resend-expired-invite.command';
import { ResendExpiredInviteUseCase } from './resend-expired-invite.use-case';

describe(ResendExpiredInviteUseCase.name, () => {
  it('preserves team assignments when replacing an expired invite', async () => {
    const inviteId = '11111111-1111-4111-8111-111111111111' as UUID;
    const teamIds = [
      '22222222-2222-4222-8222-222222222222' as UUID,
      '33333333-3333-4333-8333-333333333333' as UUID,
    ];
    const existingInvite = new Invite({
      id: inviteId,
      email: 'user@example.com',
      orgId: '44444444-4444-4444-8444-444444444444',
      role: UserRole.USER,
      expiresAt: new Date(Date.now() - 1_000),
      teamIds,
    });
    const invitesRepository = {
      findOne: jest.fn().mockResolvedValue(existingInvite),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    };
    const inviteJwtService = {
      generateInviteToken: jest.fn().mockReturnValue('new-token'),
    };
    const configService = {
      get: jest.fn().mockReturnValue('7d'),
    };
    const useCase = new ResendExpiredInviteUseCase(
      invitesRepository as unknown as InvitesRepository,
      inviteJwtService as unknown as InviteJwtService,
      configService as unknown as ConfigService,
    );

    const result = await useCase.execute(
      new ResendExpiredInviteCommand({ inviteId, orgId: existingInvite.orgId }),
    );

    expect(result.invite.teamIds).toEqual(teamIds);
    expect(invitesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds }),
    );
  });

  it('reports an expired invite of another organization as not found and keeps it', async () => {
    const inviteId = '11111111-1111-4111-8111-111111111111' as UUID;
    const invitesRepository = {
      findOne: jest.fn().mockResolvedValue(
        new Invite({
          id: inviteId,
          email: 'user@example.com',
          orgId: '44444444-4444-4444-8444-444444444444',
          role: UserRole.USER,
          expiresAt: new Date(Date.now() - 1_000),
        }),
      ),
      delete: jest.fn(),
      create: jest.fn(),
    };
    const useCase = new ResendExpiredInviteUseCase(
      invitesRepository as unknown as InvitesRepository,
      { generateInviteToken: jest.fn() } as unknown as InviteJwtService,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await expect(
      useCase.execute(
        new ResendExpiredInviteCommand({
          inviteId,
          orgId: '55555555-5555-4555-8555-555555555555',
        }),
      ),
    ).rejects.toBeInstanceOf(InviteNotFoundError);
    expect(invitesRepository.delete).not.toHaveBeenCalled();
    expect(invitesRepository.create).not.toHaveBeenCalled();
  });
});
