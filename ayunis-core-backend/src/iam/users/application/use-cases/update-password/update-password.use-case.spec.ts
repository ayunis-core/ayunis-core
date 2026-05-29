import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { UpdatePasswordUseCase } from './update-password.use-case';
import { UpdatePasswordCommand } from './update-password.command';
import { UsersRepository } from '../../ports/users.repository';
import { UserInvalidInputError } from '../../users.errors';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { ValidateUserUseCase } from '../validate-user/validate-user.use-case';
import { InvalidPasswordError } from 'src/iam/authentication/application/authentication.errors';
import { AuthenticationErrorCode } from 'src/iam/authentication/application/authentication.errors';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';

describe('UpdatePasswordUseCase', () => {
  let useCase: UpdatePasswordUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockHashTextUseCase: { execute: jest.Mock };
  let mockValidateUserUseCase: { execute: jest.Mock };

  const userId = 'user-id' as UUID;
  const buildUser = () =>
    new User({
      id: userId,
      email: 'test@example.com',
      emailVerified: true,
      passwordHash: 'old-hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
      isValidPassword: jest.fn(),
    };
    mockHashTextUseCase = { execute: jest.fn() };
    mockValidateUserUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePasswordUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: HashTextUseCase, useValue: mockHashTextUseCase },
        { provide: ValidateUserUseCase, useValue: mockValidateUserUseCase },
      ],
    }).compile();

    useCase = module.get<UpdatePasswordUseCase>(UpdatePasswordUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('updates the password when the new password meets the policy', async () => {
    const command = new UpdatePasswordCommand(
      userId,
      'CurrentPass1',
      'NewValidPass1',
      'NewValidPass1',
    );
    const user = buildUser();

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(user);
    mockValidateUserUseCase.execute.mockResolvedValue(undefined);
    jest.spyOn(mockUsersRepository, 'isValidPassword').mockResolvedValue(true);
    mockHashTextUseCase.execute.mockResolvedValue('new-hash');
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(user);

    await useCase.execute(command);

    // Policy must be checked against the NEW password, not the current one
    expect(mockUsersRepository.isValidPassword).toHaveBeenCalledWith(
      'NewValidPass1',
    );
    expect(user.passwordHash).toBe('new-hash');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(user);
  });

  it('throws INVALID_PASSWORD when the new password violates the policy', async () => {
    const command = new UpdatePasswordCommand(
      userId,
      'CurrentPass1',
      'weak',
      'weak',
    );
    const user = buildUser();

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(user);
    mockValidateUserUseCase.execute.mockResolvedValue(undefined);
    jest.spyOn(mockUsersRepository, 'isValidPassword').mockResolvedValue(false);

    await expect(useCase.execute(command)).rejects.toMatchObject({
      code: AuthenticationErrorCode.INVALID_PASSWORD,
    });
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      InvalidPasswordError,
    );

    // It must validate the new password, never the current one
    expect(mockUsersRepository.isValidPassword).toHaveBeenCalledWith('weak');
    expect(mockUsersRepository.isValidPassword).not.toHaveBeenCalledWith(
      'CurrentPass1',
    );
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('throws when the new password and confirmation do not match', async () => {
    const command = new UpdatePasswordCommand(
      userId,
      'CurrentPass1',
      'NewValidPass1',
      'Mismatch1',
    );

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UserInvalidInputError,
    );
    expect(mockUsersRepository.findOneById).not.toHaveBeenCalled();
  });
});
