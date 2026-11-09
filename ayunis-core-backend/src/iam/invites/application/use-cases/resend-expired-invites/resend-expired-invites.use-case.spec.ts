jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { BulkInviteDeliveryService } from 'src/iam/invites/application/services/bulk-invite-delivery.service';
import type { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import type { SendInvitationEmailUseCase } from 'src/iam/invites/application/use-cases/send-invitation-email/send-invitation-email.use-case';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import type { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ResendExpiredInvitesCommand } from './resend-expired-invites.command';
import { ResendExpiredInvitesUseCase } from './resend-expired-invites.use-case';

const orgId = '44444444-4444-4444-8444-444444444444' as UUID;
const inviterId = '55555555-5555-4555-8555-555555555555' as UUID;
const teamId = '22222222-2222-4222-8222-222222222222' as UUID;

function expiredInvite(email: string, teamIds: UUID[] = []): Invite {
  return new Invite({
    email,
    orgId,
    role: UserRole.MANAGER,
    inviterId,
    expiresAt: new Date(Date.now() - 1_000),
    teamIds,
  });
}

function setup(expired: Invite[], deletedIds = expired.map((i) => i.id)) {
  const invitesRepository = {
    findExpiredPendingByOrg: jest.fn().mockResolvedValue(expired),
    deletePendingByIds: jest.fn().mockResolvedValue(deletedIds),
    createMany: jest.fn().mockResolvedValue(undefined),
    expirePendingByIds: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) =>
      key === 'emails.hasConfig' ? true : fallback,
    ),
  } as unknown as ConfigService;
  const sendEmail = { execute: jest.fn().mockResolvedValue(undefined) };
  const delivery = new BulkInviteDeliveryService(
    invitesRepository as unknown as InvitesRepository,
    { generateInviteToken: () => 'token' } as unknown as InviteJwtService,
    sendEmail as unknown as SendInvitationEmailUseCase,
    config,
  );
  const useCase = new ResendExpiredInvitesUseCase(
    invitesRepository as unknown as InvitesRepository,
    config,
    {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as AcquireSeatAllocationLockUseCase,
    delivery,
  );
  const renewed = (): Invite[] =>
    invitesRepository.createMany.mock.calls[0][0] as Invite[];
  return { useCase, invitesRepository, sendEmail, renewed };
}

describe(ResendExpiredInvitesUseCase.name, () => {
  it('renews each expired invite with a new id and expiry, keeping role, teams and inviter', async () => {
    const old = expiredInvite('anna@example.com', [teamId]);
    const { useCase, renewed } = setup([old]);

    const result = await useCase.execute(
      new ResendExpiredInvitesCommand(orgId),
    );

    const [replacement] = renewed();
    expect(replacement.id).not.toBe(old.id);
    expect(replacement.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(replacement).toMatchObject({
      email: 'anna@example.com',
      orgId,
      role: UserRole.MANAGER,
      inviterId,
      teamIds: [teamId],
    });
    expect(result).toMatchObject({ totalCount: 1, successCount: 1 });
  });

  it('does not recreate an expired invite that was removed concurrently', async () => {
    const kept = expiredInvite('anna@example.com');
    const removed = expiredInvite('bert@example.com');
    const { useCase, renewed } = setup([kept, removed], [kept.id]);

    const result = await useCase.execute(
      new ResendExpiredInvitesCommand(orgId),
    );

    expect(renewed().map((invite) => invite.email)).toEqual([
      'anna@example.com',
    ]);
    expect(result.totalCount).toBe(1);
  });

  it('returns a renewal whose email failed to expired so a later resend retries it', async () => {
    const { useCase, invitesRepository, sendEmail, renewed } = setup([
      expiredInvite('anna@example.com'),
      expiredInvite('bert@example.com'),
    ]);
    sendEmail.execute.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await useCase.execute(
      new ResendExpiredInvitesCommand(orgId),
    );

    expect(result).toMatchObject({
      totalCount: 2,
      successCount: 1,
      failureCount: 1,
    });
    expect(result.results[0]).toMatchObject({
      email: 'anna@example.com',
      success: false,
      errorCode: 'EMAIL_SENDING_FAILED',
    });
    const [undeliveredIds, expiresAt] = invitesRepository.expirePendingByIds
      .mock.calls[0] as [UUID[], Date];
    expect(undeliveredIds).toEqual([renewed()[0].id]);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(invitesRepository.delete).not.toHaveBeenCalled();
  });
});
