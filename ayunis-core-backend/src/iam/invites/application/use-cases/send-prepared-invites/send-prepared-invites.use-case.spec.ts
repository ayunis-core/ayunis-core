import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendPreparedInvitesUseCase } from './send-prepared-invites.use-case';
import { SendPreparedInvitesCommand } from './send-prepared-invites.command';
import { InvitesRepository } from '../../ports/invites.repository';
import { InviteJwtService } from '../../services/invite-jwt.service';
import { SendInvitationEmailUseCase } from '../send-invitation-email/send-invitation-email.use-case';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as any;
const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;

function makePreparedInvite(email: string): Invite {
  return new Invite({
    email,
    orgId: mockOrgId,
    role: UserRole.USER,
    inviterId: mockUserId,
    // Created weeks ago — already past the original expiry window
    expiresAt: new Date('2026-01-01T00:00:00Z'),
    prepared: true,
  });
}

function configWith(hasEmailConfig: boolean) {
  return (key: string, fallback?: unknown) => {
    const values: Record<string, unknown> = {
      'emails.hasConfig': hasEmailConfig,
      'auth.jwt.inviteExpiresIn': '7d',
      'app.frontend.baseUrl': 'https://app.example.com',
      'app.frontend.inviteAcceptEndpoint': '/accept-invite',
    };
    return key in values ? values[key] : fallback;
  };
}

describe('SendPreparedInvitesUseCase', () => {
  let useCase: SendPreparedInvitesUseCase;
  let invitesRepository: jest.Mocked<InvitesRepository>;
  let configService: jest.Mocked<ConfigService>;
  let inviteJwtService: jest.Mocked<InviteJwtService>;
  let sendInvitationEmailUseCase: jest.Mocked<SendInvitationEmailUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendPreparedInvitesUseCase,
        {
          provide: InvitesRepository,
          useValue: { findPreparedByOrg: jest.fn(), markAsSent: jest.fn() },
        },
        {
          provide: InviteJwtService,
          useValue: { generateInviteToken: jest.fn() },
        },
        {
          provide: SendInvitationEmailUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(SendPreparedInvitesUseCase);
    invitesRepository = module.get(InvitesRepository);
    configService = module.get(ConfigService);
    inviteJwtService = module.get(InviteJwtService);
    sendInvitationEmailUseCase = module.get(SendInvitationEmailUseCase);

    inviteJwtService.generateInviteToken.mockReturnValue('mock-token');
    configService.get.mockImplementation(configWith(true));

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('returns zero counts when there are no prepared invites', async () => {
    invitesRepository.findPreparedByOrg.mockResolvedValue([]);

    const result = await useCase.execute(
      new SendPreparedInvitesCommand({ orgId: mockOrgId, userId: mockUserId }),
    );

    expect(result).toEqual({
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
      results: [],
    });
    expect(sendInvitationEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it('sends an email and refreshes expiry for each prepared invite', async () => {
    const invites = [
      makePreparedInvite('first@gemeinde.de'),
      makePreparedInvite('second@gemeinde.de'),
    ];
    invitesRepository.findPreparedByOrg.mockResolvedValue(invites);

    const before = Date.now();
    const result = await useCase.execute(
      new SendPreparedInvitesCommand({ orgId: mockOrgId, userId: mockUserId }),
    );

    expect(result.totalCount).toBe(2);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
    expect(sendInvitationEmailUseCase.execute).toHaveBeenCalledTimes(2);
    expect(invitesRepository.markAsSent).toHaveBeenCalledTimes(2);

    const [, refreshedExpiry] = invitesRepository.markAsSent.mock.calls[0];
    expect(refreshedExpiry.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('returns the accept url instead of sending when email is not configured', async () => {
    configService.get.mockImplementation(configWith(false));
    invitesRepository.findPreparedByOrg.mockResolvedValue([
      makePreparedInvite('user@gemeinde.de'),
    ]);

    const result = await useCase.execute(
      new SendPreparedInvitesCommand({ orgId: mockOrgId, userId: mockUserId }),
    );

    expect(sendInvitationEmailUseCase.execute).not.toHaveBeenCalled();
    expect(result.results[0].url).toBe(
      'https://app.example.com/accept-invite?token=mock-token',
    );
    expect(invitesRepository.markAsSent).toHaveBeenCalledTimes(1);
  });

  it('keeps the invite prepared when sending its email fails', async () => {
    invitesRepository.findPreparedByOrg.mockResolvedValue([
      makePreparedInvite('flaky@gemeinde.de'),
    ]);
    sendInvitationEmailUseCase.execute.mockRejectedValue(
      new Error('SMTP unavailable'),
    );

    const result = await useCase.execute(
      new SendPreparedInvitesCommand({ orgId: mockOrgId, userId: mockUserId }),
    );

    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.results[0].success).toBe(false);
    // The invite must not be marked as sent so it can be retried later
    expect(invitesRepository.markAsSent).not.toHaveBeenCalled();
  });
});
