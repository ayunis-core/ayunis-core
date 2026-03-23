import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SuperAdminTriggerPasswordResetUseCase } from './super-admin-trigger-password-reset.use-case';
import { SuperAdminTriggerPasswordResetCommand } from './super-admin-trigger-password-reset.command';
import { UsersRepository } from '../../ports/users.repository';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { SendPasswordResetEmailUseCase } from '../send-password-reset-email/send-password-reset-email.use-case';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UserNotFoundError } from '../../users.errors';
import type { UUID } from 'crypto';

describe('SuperAdminTriggerPasswordResetUseCase', () => {
  let useCase: SuperAdminTriggerPasswordResetUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockPasswordResetJwtService: Partial<PasswordResetJwtService>;
  let mockSendPasswordResetEmailUseCase: Partial<SendPasswordResetEmailUseCase>;

  const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const userEmail = 'maria.mueller@gemeinde.de';
  const userName = 'Maria Müller';
  const orgId = '660e8400-e29b-41d4-a716-446655440000' as UUID;
  const resetToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-token';
  const frontendBaseUrl = 'http://localhost:3001';
  const passwordResetEndpoint = '/password/reset';

  const mockUser = new User({
    id: userId,
    name: userName,
    email: userEmail,
    emailVerified: true,
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    orgId,
    hasAcceptedMarketing: false,
  });

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
    };

    mockPasswordResetJwtService = {
      generatePasswordResetToken: jest.fn(),
    };

    mockSendPasswordResetEmailUseCase = {
      execute: jest.fn(),
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
      ],
    }).compile();

    useCase = module.get<SuperAdminTriggerPasswordResetUseCase>(
      SuperAdminTriggerPasswordResetUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest
      .spyOn(mockPasswordResetJwtService, 'generatePasswordResetToken')
      .mockReturnValue(resetToken);
    jest
      .spyOn(mockSendPasswordResetEmailUseCase, 'execute')
      .mockResolvedValue(
        `${frontendBaseUrl}${passwordResetEndpoint}?token=${resetToken}`,
      );
  });

  it('should send password reset email and return the reset URL', async () => {
    const command = new SuperAdminTriggerPasswordResetCommand(userId);

    const result = await useCase.execute(command);

    expect(result.resetUrl).toBe(
      `${frontendBaseUrl}${passwordResetEndpoint}?token=${resetToken}`,
    );
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith(userId);
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
  });

  it('should throw UserNotFoundError when user does not exist', async () => {
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    const command = new SuperAdminTriggerPasswordResetCommand(userId);

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockSendPasswordResetEmailUseCase.execute).not.toHaveBeenCalled();
  });
});
