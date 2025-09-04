import { Test, TestingModule } from '@nestjs/testing';
import { RegisterUserUseCase } from './register-user.use-case';
import { UnexpectedAuthenticationError } from '../../authentication.errors';
import { RegisterUserCommand } from './register-user.command';
import { CreateAdminUserUseCase } from '../../../../users/application/use-cases/create-admin-user/create-admin-user.use-case';
import { IsValidPasswordUseCase } from '../../../../users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { CreateOrgUseCase } from '../../../../orgs/application/use-cases/create-org/create-org.use-case';
import { User } from '../../../../users/domain/user.entity';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { Org } from '../../../../orgs/domain/org.entity';
import { ActiveUser } from '../../../domain/active-user.entity';
import { InvalidPasswordError } from '../../authentication.errors';
import { UUID } from 'crypto';
import { CreateLegalAcceptanceUseCase } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.use-case';
import { SendConfirmationEmailUseCase } from 'src/iam/users/application/use-cases/send-confirmation-email/send-confirmation-email.use-case';
import { CreateTrialUseCase } from 'src/iam/subscriptions/application/use-cases/create-trial/create-trial.use-case';
import { ConfigService } from '@nestjs/config';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { FindUserByEmailUseCase } from '../../../../users/application/use-cases/find-user-by-email/find-user-by-email.use-case';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockCreateAdminUserUseCase: Partial<CreateAdminUserUseCase>;
  let mockIsValidPasswordUseCase: Partial<IsValidPasswordUseCase>;
  let mockCreateOrgUseCase: Partial<CreateOrgUseCase>;
  let mockFindUserByEmailUseCase: Partial<FindUserByEmailUseCase>;

  beforeEach(async () => {
    mockCreateAdminUserUseCase = {
      execute: jest.fn(),
    };
    mockIsValidPasswordUseCase = {
      execute: jest.fn(),
    };
    mockCreateOrgUseCase = {
      execute: jest.fn(),
    };
    mockFindUserByEmailUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserUseCase,
        {
          provide: FindUserByEmailUseCase,
          useValue: mockFindUserByEmailUseCase,
        },
        {
          provide: CreateAdminUserUseCase,
          useValue: mockCreateAdminUserUseCase,
        },
        {
          provide: IsValidPasswordUseCase,
          useValue: mockIsValidPasswordUseCase,
        },
        { provide: CreateOrgUseCase, useValue: mockCreateOrgUseCase },
        {
          provide: CreateLegalAcceptanceUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SendConfirmationEmailUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: CreateTrialUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(false) },
        },
        { provide: SendWebhookUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    useCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should register user successfully', async () => {
    const command = new RegisterUserCommand({
      userName: 'test',
      email: 'test@example.com',
      password: 'validPassword123',
      orgName: 'Test Org',
      hasAcceptedMarketing: false,
    });
    const mockOrg = new Org({ id: 'org-id' as UUID, name: 'Test Org' });
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hashedPassword',
      role: UserRole.ADMIN,
      orgId: 'org-id' as UUID,
      name: 'test',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(true);
    jest.spyOn(mockCreateOrgUseCase, 'execute').mockResolvedValue(mockOrg);
    jest
      .spyOn(mockCreateAdminUserUseCase, 'execute')
      .mockResolvedValue(mockUser);

    const result = await useCase.execute(command);

    expect(result).toBeInstanceOf(ActiveUser);
    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe(mockUser.email);
    expect(result.role).toBe(mockUser.role);
    expect(result.orgId).toBe(mockUser.orgId);
    expect(mockIsValidPasswordUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'validPassword123' }),
    );
    expect(mockCreateOrgUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Org' }),
    );
    expect(mockCreateAdminUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        password: 'validPassword123',
        orgId: 'org-id',
      }),
    );
  });

  it('should throw InvalidPasswordError for invalid password', async () => {
    const command = new RegisterUserCommand({
      userName: 'test',
      email: 'test@example.com',
      password: 'weak',
      orgName: 'Test Org',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(false);

    await expect(useCase.execute(command)).rejects.toThrow(
      InvalidPasswordError,
    );
  });

  it('should throw AuthenticationFailedError for unexpected errors', async () => {
    const command = new RegisterUserCommand({
      userName: 'test',
      email: 'test@example.com',
      password: 'validPassword123',
      orgName: 'Test Org',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(true);
    jest
      .spyOn(mockCreateOrgUseCase, 'execute')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedAuthenticationError,
    );
  });
});
