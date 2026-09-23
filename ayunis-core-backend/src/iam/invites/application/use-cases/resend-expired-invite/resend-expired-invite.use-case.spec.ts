import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import type { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
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
      new ResendExpiredInviteCommand(inviteId),
    );

    expect(result.invite.teamIds).toEqual(teamIds);
    expect(invitesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds }),
    );
  });
});
