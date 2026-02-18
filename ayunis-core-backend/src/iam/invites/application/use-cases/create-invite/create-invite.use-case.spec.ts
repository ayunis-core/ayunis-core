import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateInviteUseCase } from './create-invite.use-case';
import { CreateInviteCommand } from './create-invite.command';
import { InvitesRepository } from '../../ports/invites.repository';
import { InviteJwtService } from '../../services/invite-jwt.service';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { SendInvitationEmailUseCase } from '../send-invitation-email/send-invitation-email.use-case';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SubscriptionNotFoundError } from 'src/iam/subscriptions/application/subscription.errors';
import {
  EmailNotAvailableError,
  InvalidSeatsError,
  UnexpectedInviteError,
} from '../../invites.errors';

describe('CreateInviteUseCase', () => {
  let useCase: CreateInviteUseCase;
  let invitesRepository: jest.Mocked<InvitesRepository>;
  let configService: jest.Mocked<ConfigService>;
  let inviteJwtService: jest.Mocked<InviteJwtService>;
  let getActiveSubscriptionUseCase: jest.Mocked<GetActiveSubscriptionUseCase>;
  let updateSeatsUseCase: jest.Mocked<UpdateSeatsUseCase>;
  let sendInvitationEmailUseCase: jest.Mocked<SendInvitationEmailUseCase>;
  let findUserByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as any;
  const mockEmail = 'test@test.com';

  beforeEach(async () => {
    const mockInvitesRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByToken: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockInviteJwtService = {
      generateInviteToken: jest.fn(),
      verifyInviteToken: jest.fn(),
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

    const mockFindUserByEmailUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInviteUseCase,
        { provide: InvitesRepository, useValue: mockInvitesRepository },
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
        {
          provide: FindUserByEmailUseCase,
          useValue: mockFindUserByEmailUseCase,
        },
      ],
    }).compile();

    useCase = module.get<CreateInviteUseCase>(CreateInviteUseCase);
    invitesRepository = module.get(InvitesRepository);
    configService = module.get(ConfigService);
    inviteJwtService = module.get(InviteJwtService);
    getActiveSubscriptionUseCase = module.get(GetActiveSubscriptionUseCase);
    updateSeatsUseCase = module.get(UpdateSeatsUseCase);
    sendInvitationEmailUseCase = module.get(SendInvitationEmailUseCase);
    findUserByEmailUseCase = module.get(FindUserByEmailUseCase);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create invite successfully for self-hosted instance', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(false) // app.isCloudHosted
        .mockReturnValueOnce('7d') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(true); // emails.hasConfig

      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      // Act
      await useCase.execute(command);

      // Assert
      expect(findUserByEmailUseCase.execute).toHaveBeenCalled();
      expect(invitesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          orgId: mockOrgId,
          role: UserRole.USER,
          inviterId: mockUserId,
        }),
      );
      expect(inviteJwtService.generateInviteToken).toHaveBeenCalled();
    });

    it('should create invite for cloud instance with available seats', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      const mockSubscription = {
        availableSeats: 5,
        nextRenewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subscription: {
          id: 'sub-id' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          orgId: mockOrgId,
          noOfSeats: 10,
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
      };

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(true) // app.isCloudHosted
        .mockReturnValueOnce('7d') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(true); // emails.hasConfig

      getActiveSubscriptionUseCase.execute.mockResolvedValue(mockSubscription);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      // Act
      await useCase.execute(command);

      // Assert
      expect(getActiveSubscriptionUseCase.execute).toHaveBeenCalled();
      expect(updateSeatsUseCase.execute).not.toHaveBeenCalled();
      expect(invitesRepository.create).toHaveBeenCalled();
    });

    it('should create invite when no active subscription is found in cloud instance', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(true) // app.isCloudHosted
        .mockReturnValueOnce('7d') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(true); // extra config calls (ignored)

      getActiveSubscriptionUseCase.execute.mockRejectedValue(
        new SubscriptionNotFoundError(mockOrgId),
      );
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      // Act
      await useCase.execute(command);

      // Assert
      expect(getActiveSubscriptionUseCase.execute).toHaveBeenCalled();
      expect(updateSeatsUseCase.execute).not.toHaveBeenCalled();
      expect(invitesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          orgId: mockOrgId,
        }),
      );
    });

    it('should update seats when no available seats in cloud instance', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      const mockSubscription = {
        availableSeats: 0,
        nextRenewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subscription: {
          id: 'sub-id' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          orgId: mockOrgId,
          noOfSeats: 10,
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
      };

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(true) // app.isCloudHosted
        .mockReturnValueOnce('7d') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(true); // emails.hasConfig

      getActiveSubscriptionUseCase.execute.mockResolvedValue(mockSubscription);
      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      // Act
      await useCase.execute(command);

      // Assert
      expect(updateSeatsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockOrgId,
          requestingUserId: mockUserId,
          noOfSeats: 11,
        }),
      );
      expect(invitesRepository.create).toHaveBeenCalled();
    });

    it('should throw EmailNotAvailableError when user already exists', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      const mockExistingUser = { id: 'existing-user-id' };
      findUserByEmailUseCase.execute.mockResolvedValue(mockExistingUser as any);

      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(false) // app.isCloudHosted
        .mockReturnValueOnce('7d') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(true); // emails.hasConfig

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        EmailNotAvailableError,
      );
      expect(invitesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw InvalidSeatsError when subscription has negative available seats', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      const mockSubscription = {
        availableSeats: -1,
        nextRenewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subscription: {
          id: 'sub-id' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          cancelledAt: null,
          orgId: mockOrgId,
          noOfSeats: 10,
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
      };

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(true) // app.isCloudHosted
        .mockReturnValueOnce('7d') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(true); // emails.hasConfig

      getActiveSubscriptionUseCase.execute.mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(InvalidSeatsError);
      expect(invitesRepository.create).not.toHaveBeenCalled();
    });

    it('should skip email sending when email config is not available', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(false) // app.isCloudHosted
        .mockReturnValueOnce('7d') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(false); // emails.hasConfig

      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      // Act
      await useCase.execute(command);

      // Assert
      expect(invitesRepository.create).toHaveBeenCalled();
      expect(sendInvitationEmailUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle repository errors and throw UnexpectedInviteError', async () => {
      // Arrange
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(false) // app.isCloudHosted
        .mockReturnValueOnce('7d'); // auth.jwt.inviteExpiresIn

      const repositoryError = new Error('Database connection failed');
      invitesRepository.create.mockRejectedValue(repositoryError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedInviteError,
      );
      expect(errorSpy).toHaveBeenCalledWith('Error creating invite', {
        error: 'Database connection failed',
      });
    });

    it('should parse different time formats correctly', async () => {
      // Test private method indirectly by checking expiration dates
      const command = new CreateInviteCommand({
        email: mockEmail,
        orgId: mockOrgId,
        role: UserRole.USER,
        userId: mockUserId,
      });

      findUserByEmailUseCase.execute.mockResolvedValue(null);
      configService.get
        .mockReturnValueOnce([]) // auth.emailProviderBlacklist
        .mockReturnValueOnce(false) // app.isCloudHosted
        .mockReturnValueOnce('24h') // auth.jwt.inviteExpiresIn
        .mockReturnValueOnce(false); // emails.hasConfig

      inviteJwtService.generateInviteToken.mockReturnValue('mock-token');

      const beforeExecution = Date.now();
      await useCase.execute(command);
      const afterExecution = Date.now();

      // Verify the invite was created with correct expiration
      expect(invitesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      );

      const createdInvite = invitesRepository.create.mock.calls[0][0];
      const expirationTime = createdInvite.expiresAt.getTime();
      const expectedMin = beforeExecution + 24 * 60 * 60 * 1000; // 24 hours
      const expectedMax = afterExecution + 24 * 60 * 60 * 1000;

      expect(expirationTime).toBeGreaterThanOrEqual(expectedMin);
      expect(expirationTime).toBeLessThanOrEqual(expectedMax);
    });
  });
});
