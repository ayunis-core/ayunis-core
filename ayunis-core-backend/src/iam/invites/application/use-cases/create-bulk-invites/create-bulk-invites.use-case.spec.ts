import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateBulkInvitesUseCase } from './create-bulk-invites.use-case';
import { CreateBulkInvitesCommand } from './create-bulk-invites.command';
import { InvitesRepository } from '../../ports/invites.repository';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { InviteJwtService } from '../../services/invite-jwt.service';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { SendInvitationEmailUseCase } from '../send-invitation-email/send-invitation-email.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SubscriptionNotFoundError } from 'src/iam/subscriptions/application/subscription.errors';
import {
  BulkInviteValidationFailedError,
  InvalidSeatsError,
  UnexpectedInviteError,
} from '../../invites.errors';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { User } from 'src/iam/users/domain/user.entity';

describe('CreateBulkInvitesUseCase', () => {
  let useCase: CreateBulkInvitesUseCase;
  let invitesRepository: jest.Mocked<InvitesRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let configService: jest.Mocked<ConfigService>;
  let inviteJwtService: jest.Mocked<InviteJwtService>;
  let getActiveSubscriptionUseCase: jest.Mocked<GetActiveSubscriptionUseCase>;
  let updateSeatsUseCase: jest.Mocked<UpdateSeatsUseCase>;
  let sendInvitationEmailUseCase: jest.Mocked<SendInvitationEmailUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as any;

  beforeEach(async () => {
    const mockInvitesRepository = {
      create: jest.fn(),
      createMany: jest.fn(),
      findByEmailsAndOrg: jest.fn(),
      deleteAllPendingByOrg: jest.fn(),
      delete: jest.fn(),
    };

    const mockUsersRepository = {
      findOneByEmail: jest.fn(),
      findManyByEmails: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockInviteJwtService = {
      generateInviteToken: jest.fn(),
    };

    const mockGetActiveSubscriptionUseCase = {
      execute: jest.fn(),
    };

    const mockUpdateSeatsUseCase = {
      execute: jest.fn(),
    };

    const mockSendInvitationEmailUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBulkInvitesUseCase,
        { provide: InvitesRepository, useValue: mockInvitesRepository },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: InviteJwtService, useValue: mockInviteJwtService },
        {
          provide: GetActiveSubscriptionUseCase,
          useValue: mockGetActiveSubscriptionUseCase,
        },
        { provide: UpdateSeatsUseCase, useValue: mockUpdateSeatsUseCase },
        {
          provide: SendInvitationEmailUseCase,
          useValue: mockSendInvitationEmailUseCase,
        },
      ],
    }).compile();

    useCase = module.get<CreateBulkInvitesUseCase>(CreateBulkInvitesUseCase);
    invitesRepository = module.get(InvitesRepository);
    usersRepository = module.get(UsersRepository);
    configService = module.get(ConfigService);
    inviteJwtService = module.get(InviteJwtService);
    getActiveSubscriptionUseCase = module.get(GetActiveSubscriptionUseCase);
    updateSeatsUseCase = module.get(UpdateSeatsUseCase);
    sendInvitationEmailUseCase = module.get(SendInvitationEmailUseCase);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupDefaultConfigMocks = (overrides?: {
    emailProviderBlacklist?: string[];
    isCloudHosted?: boolean;
    inviteExpiresIn?: string;
    hasEmailConfig?: boolean;
    frontendBaseUrl?: string;
    inviteAcceptEndpoint?: string;
  }) => {
    const defaults = {
      emailProviderBlacklist: [],
      isCloudHosted: false,
      inviteExpiresIn: '7d',
      hasEmailConfig: false,
      frontendBaseUrl: 'http://localhost:3001',
      inviteAcceptEndpoint: '/accept-invite',
      ...overrides,
    };

    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'auth.emailProviderBlacklist':
          return defaults.emailProviderBlacklist;
        case 'app.isCloudHosted':
          return defaults.isCloudHosted;
        case 'auth.jwt.inviteExpiresIn':
          return defaults.inviteExpiresIn;
        case 'emails.hasConfig':
          return defaults.hasEmailConfig;
        case 'app.frontend.baseUrl':
          return defaults.frontendBaseUrl;
        case 'app.frontend.inviteAcceptEndpoint':
          return defaults.inviteAcceptEndpoint;
        default:
          return undefined;
      }
    });
  };

  describe('execute', () => {
    it('should create bulk invites successfully for self-hosted instance', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [
          { email: 'user1@example.com', role: UserRole.USER },
          { email: 'user2@example.com', role: UserRole.ADMIN },
        ],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks();
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      const result = await useCase.execute(command);

      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(invitesRepository.createMany).toHaveBeenCalledTimes(1);
      expect(invitesRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: 'user1@example.com' }),
          expect.objectContaining({ email: 'user2@example.com' }),
        ]),
      );
    });

    it('should return invite URLs when email config is not available', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user1@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ hasEmailConfig: false });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      const result = await useCase.execute(command);

      expect(result.results[0].url).toBe(
        'http://localhost:3001/accept-invite?token=mock-token',
      );
      expect(sendInvitationEmailUseCase.execute).not.toHaveBeenCalled();
    });

    it('should send emails and not return URLs when email config is available', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user1@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ hasEmailConfig: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      const result = await useCase.execute(command);

      expect(result.results[0].url).toBeNull();
      expect(sendInvitationEmailUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should delete invite and mark as failed when email sending fails', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user1@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ hasEmailConfig: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');
      sendInvitationEmailUseCase.execute.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      const result = await useCase.execute(command);

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].url).toBeNull();
      expect(result.results[0].errorCode).toBe('EMAIL_SENDING_FAILED');
      expect(result.results[0].errorMessage).toBe('Email service unavailable');
      expect(invitesRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('should delete invite from database when JWT generation fails', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks();
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockImplementation(() => {
        throw new Error('JWT generation failed');
      });

      const result = await useCase.execute(command);

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].errorMessage).toBe('JWT generation failed');
      expect(invitesRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed success/failure in bulk invites', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [
          { email: 'success@example.com', role: UserRole.USER },
          { email: 'fail@example.com', role: UserRole.USER },
        ],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ hasEmailConfig: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      // First email succeeds, second fails
      sendInvitationEmailUseCase.execute
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Email failed'));

      const result = await useCase.execute(command);

      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(invitesRepository.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation', () => {
    it('should throw BulkInviteValidationFailedError for duplicate emails in request', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [
          { email: 'duplicate@example.com', role: UserRole.USER },
          { email: 'duplicate@example.com', role: UserRole.ADMIN },
        ],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks();
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);

      await expect(useCase.execute(command)).rejects.toThrow(
        BulkInviteValidationFailedError,
      );
      expect(invitesRepository.createMany).not.toHaveBeenCalled();
    });

    it('should throw BulkInviteValidationFailedError for blacklisted email providers', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@gmail.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ emailProviderBlacklist: ['gmail'] });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);

      await expect(useCase.execute(command)).rejects.toThrow(
        BulkInviteValidationFailedError,
      );
    });

    it('should throw BulkInviteValidationFailedError when email already has pending invite', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'existing@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks();
      const existingInvite = new Invite({
        email: 'existing@example.com',
        orgId: mockOrgId,
        role: UserRole.USER,
        expiresAt: new Date(Date.now() + 86400000),
      });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([existingInvite]);
      usersRepository.findManyByEmails.mockResolvedValue([]);

      await expect(useCase.execute(command)).rejects.toThrow(
        BulkInviteValidationFailedError,
      );
    });

    it('should throw BulkInviteValidationFailedError when email is already a user', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks();
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      const existingUser = new User({
        id: 'user-id' as any,
        email: 'user@example.com',
        emailVerified: true,
        passwordHash: 'hash',
        role: UserRole.USER,
        orgId: mockOrgId,
        name: 'Existing User',
        hasAcceptedMarketing: false,
      });
      usersRepository.findManyByEmails.mockResolvedValue([existingUser]);

      await expect(useCase.execute(command)).rejects.toThrow(
        BulkInviteValidationFailedError,
      );
    });

    it('should collect multiple validation errors', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [
          { email: 'duplicate@example.com', role: UserRole.USER },
          { email: 'duplicate@example.com', role: UserRole.ADMIN },
          { email: 'user@gmail.com', role: UserRole.USER },
        ],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ emailProviderBlacklist: ['gmail'] });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);

      try {
        await useCase.execute(command);
        fail('Expected BulkInviteValidationFailedError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BulkInviteValidationFailedError);
        const bulkError = error as BulkInviteValidationFailedError;
        // Should have duplicate error + blacklist error
        expect(bulkError.metadata?.errors).toHaveLength(2);
      }
    });
  });

  describe('cloud deployment seat handling', () => {
    const createMockSubscription = (
      availableSeats: number,
      noOfSeats: number,
    ) => ({
      availableSeats,
      nextRenewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subscription: {
        id: 'sub-id' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        cancelledAt: null,
        orgId: mockOrgId,
        noOfSeats,
        pricePerSeat: 0,
        renewalCycle: 'monthly' as any,
        renewalCycleAnchor: new Date(),
        billingInfo: {
          id: 'bill',
          createdAt: new Date(),
          updatedAt: new Date(),
          currency: 'USD',
          status: 'active',
        } as any,
      },
    });

    it('should not check subscription for self-hosted instance', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ isCloudHosted: false });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      await useCase.execute(command);

      expect(getActiveSubscriptionUseCase.execute).not.toHaveBeenCalled();
    });

    it('should proceed when enough seats are available in cloud instance', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [
          { email: 'user1@example.com', role: UserRole.USER },
          { email: 'user2@example.com', role: UserRole.USER },
        ],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ isCloudHosted: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');
      getActiveSubscriptionUseCase.execute.mockResolvedValue(
        createMockSubscription(5, 10),
      );

      await useCase.execute(command);

      expect(updateSeatsUseCase.execute).not.toHaveBeenCalled();
      expect(invitesRepository.createMany).toHaveBeenCalledTimes(1);
    });

    it('should update seats when not enough available in cloud instance', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [
          { email: 'user1@example.com', role: UserRole.USER },
          { email: 'user2@example.com', role: UserRole.USER },
          { email: 'user3@example.com', role: UserRole.USER },
        ],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ isCloudHosted: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');
      getActiveSubscriptionUseCase.execute.mockResolvedValue(
        createMockSubscription(1, 10),
      );

      await useCase.execute(command);

      expect(updateSeatsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          noOfSeats: 12, // 10 + (3 - 1) = 12
        }),
      );
    });

    it('should proceed when no subscription found in cloud instance', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ isCloudHosted: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');
      getActiveSubscriptionUseCase.execute.mockRejectedValue(
        new SubscriptionNotFoundError(mockOrgId),
      );

      await useCase.execute(command);

      expect(updateSeatsUseCase.execute).not.toHaveBeenCalled();
      expect(invitesRepository.createMany).toHaveBeenCalledTimes(1);
    });

    it('should throw InvalidSeatsError when subscription has negative available seats', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ isCloudHosted: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      getActiveSubscriptionUseCase.execute.mockResolvedValue(
        createMockSubscription(-1, 10),
      );

      await expect(useCase.execute(command)).rejects.toThrow(InvalidSeatsError);
      expect(invitesRepository.createMany).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw UnexpectedInviteError for repository errors', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks();
      invitesRepository.findByEmailsAndOrg.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedInviteError,
      );
    });

    it('should throw UnexpectedInviteError when batch creation fails', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [
          { email: 'user1@example.com', role: UserRole.USER },
          { email: 'user2@example.com', role: UserRole.USER },
        ],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks();
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      invitesRepository.createMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedInviteError,
      );
    });

    it('should re-throw application errors', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ isCloudHosted: true });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      getActiveSubscriptionUseCase.execute.mockRejectedValue(
        new Error('Unexpected subscription error'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedInviteError,
      );
    });
  });

  describe('time parsing', () => {
    it('should parse different time formats correctly', async () => {
      const command = new CreateBulkInvitesCommand({
        invites: [{ email: 'user@example.com', role: UserRole.USER }],
        orgId: mockOrgId,
        userId: mockUserId,
      });

      setupDefaultConfigMocks({ inviteExpiresIn: '24h' });
      invitesRepository.findByEmailsAndOrg.mockResolvedValue([]);
      usersRepository.findManyByEmails.mockResolvedValue([]);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      const beforeExecution = Date.now();
      await useCase.execute(command);
      const afterExecution = Date.now();

      expect(invitesRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        ]),
      );

      const createdInvites = invitesRepository.createMany.mock.calls[0][0];
      const expirationTime = createdInvites[0].expiresAt.getTime();
      const expectedMin = beforeExecution + 24 * 60 * 60 * 1000;
      const expectedMax = afterExecution + 24 * 60 * 60 * 1000;

      expect(expirationTime).toBeGreaterThanOrEqual(expectedMin);
      expect(expirationTime).toBeLessThanOrEqual(expectedMax);
    });
  });
});
