import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SuperAdminTriggerPasswordResetUseCase } from './super-admin-trigger-password-reset.use-case';
import { SuperAdminTriggerPasswordResetCommand } from './super-admin-trigger-password-reset.command';
import { UsersRepository } from '../../ports/users.repository';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { SendPasswordResetEmailUseCase } from '../send-password-reset-email/send-password-reset-email.use-case';
import { SendSetInitialPasswordEmailUseCase } from '../send-set-initial-password-email/send-set-initial-password-email.use-case';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UserNotFoundError } from '../../users.errors';
import type { UUID } from 'crypto';

describe('SuperAdminTriggerPasswordResetUseCase', () => {
  let useCase: SuperAdminTriggerPasswordResetUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockPasswordResetJwtService: Partial<PasswordResetJwtService>;
  let mockSendPasswordResetEmailUseCase: Partial<SendPasswordResetEmailUseCase>;
  let mockSendSetInitialPasswordEmailUseCase: Partial<SendSetInitialPasswordEmailUseCase>;
  let mockConfigService: Partial<ConfigService>;

  const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const userEmail = 'maria.mueller@gemeinde.de';
  const userName = 'Maria Müller';
  const orgId = '660e8400-e29b-41d4-a716-446655440000' as UUID;
  const resetToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token';
  const activationToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-activation-token';
  const frontendBaseUrl = 'http://localhost:3001';
  const passwordResetEndpoint = '/password/reset';

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
    };

    mockPasswordResetJwtService = {
      generatePasswordResetToken: jest.fn(),
      generateInitialPasswordToken: jest.fn(),
    };

    mockSendPasswordResetEmailUseCase = {
      execute: jest.fn(),
    };

    mockSendSetInitialPasswordEmailUseCase = {
      execute: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminTriggerPasswordResetUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        {
          provide: PasswordResetJwtService,
          useValue: mockPasswordResetJwtService,
        },
        {
          provide: SendPasswordResetEmailUseCase,
          useValue: mockSendPasswordResetEmailUseCase,
        },
        {
          provide: SendSetInitialPasswordEmailUseCase,
          useValue: mockSendSetInitialPasswordEmailUseCase,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<SuperAdminTriggerPasswordResetUseCase>(
      SuperAdminTriggerPasswordResetUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(mockPasswordResetJwtService, 'generatePasswordResetToken')
      .mockReturnValue(resetToken);
    jest
      .spyOn(mockPasswordResetJwtService, 'generateInitialPasswordToken')
      .mockReturnValue(activationToken);
    jest
      .spyOn(mockSendPasswordResetEmailUseCase, 'execute')
      .mockResolvedValue(undefined);
    jest
      .spyOn(mockSendSetInitialPasswordEmailUseCase, 'execute')
      .mockResolvedValue(undefined);
    jest.spyOn(mockConfigService, 'get').mockImplementation((key: string) => {
      if (key === 'app.frontend.baseUrl') return frontendBaseUrl;
      if (key === 'app.frontend.passwordResetEndpoint')
        return passwordResetEndpoint;
      return undefined;
    });
  });

  it('should send password reset email for activated user', async () => {
    const activatedUser = new User({
      id: userId,
      name: userName,
      email: userEmail,
      emailVerified: true,
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      orgId,
      hasAcceptedMarketing: false,
      activated: true,
    });
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(activatedUser);

    const command = new SuperAdminTriggerPasswordResetCommand(userId);
    const result = await useCase.execute(command);

    expect(result.resetUrl).toBe(
      `${frontendBaseUrl}${passwordResetEndpoint}?token=${resetToken}`,
    );
    expect(
      mockPasswordResetJwtService.generatePasswordResetToken,
    ).toHaveBeenCalledWith({ userId, email: userEmail });
    expect(mockSendPasswordResetEmailUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail,
        resetToken,
        userName,
      }),
    );
    expect(
      mockSendSetInitialPasswordEmailUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('should send activation email for non-activated user', async () => {
    const unactivatedUser = new User({
      id: userId,
      name: userName,
      email: userEmail,
      emailVerified: true,
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      orgId,
      hasAcceptedMarketing: false,
      activated: false,
    });
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(unactivatedUser);

    const command = new SuperAdminTriggerPasswordResetCommand(userId);
    const result = await useCase.execute(command);

    expect(result.resetUrl).toBe(
      `${frontendBaseUrl}${passwordResetEndpoint}?token=${activationToken}`,
    );
    expect(
      mockPasswordResetJwtService.generateInitialPasswordToken,
    ).toHaveBeenCalledWith({ userId, email: userEmail });
    expect(mockSendSetInitialPasswordEmailUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail,
        userName,
        resetToken: activationToken,
        orgId,
      }),
    );
    expect(mockSendPasswordResetEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw UserNotFoundError when user does not exist', async () => {
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    const command = new SuperAdminTriggerPasswordResetCommand(userId);

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockSendPasswordResetEmailUseCase.execute).not.toHaveBeenCalled();
    expect(
      mockSendSetInitialPasswordEmailUseCase.execute,
    ).not.toHaveBeenCalled();
  });
});
