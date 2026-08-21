import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { CreateUserUseCase } from './create-user.use-case';
import { CreateUserCommand } from './create-user.command';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  UserAlreadyExistsError,
  UserEmailProviderBlacklistedError,
} from 'src/iam/users/application/users.errors';
import type { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import type { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import type { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { UserCreatedEventPublisher } from 'src/iam/users/application/services/user-created-event-publisher.service';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let usersRepository: jest.Mocked<UsersRepository>;
  let hashTextUseCase: jest.Mocked<HashTextUseCase>;
  let configService: jest.Mocked<ConfigService>;
  let publishUserCreated: jest.Mocked<UserCreatedEventPublisher>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const validCommand = new CreateUserCommand({
    email: 'maria.garcia@ayunis.de',
    password: 'Sicher3sPasswort!',
    orgId,
    name: 'Maria Garcia',
    role: UserRole.USER,
    emailVerified: false,
    hasAcceptedMarketing: true,
  });

  beforeEach(() => {
    usersRepository = {
      findOneByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (user: User) => user),
    } as unknown as jest.Mocked<UsersRepository>;

    hashTextUseCase = {
      execute: jest.fn().mockResolvedValue('hashed-password-value'),
    } as unknown as jest.Mocked<HashTextUseCase>;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'auth.emailProviderBlacklist') return ['tempmail.com'];
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    publishUserCreated = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<UserCreatedEventPublisher>;

    useCase = new CreateUserUseCase(
      createPinoLoggerMock(),
      usersRepository,
      hashTextUseCase,
      configService,
      publishUserCreated,
    );
  });

  it('publishes the created user after persistence succeeds', async () => {
    const result = await useCase.execute(validCommand);

    expect(publishUserCreated.publish).toHaveBeenCalledWith(result);
  });

  it('publishes the created user with its department', async () => {
    const commandWithDept = new CreateUserCommand({
      email: 'counter@ayunis.de',
      password: 'Sicher3sPasswort!',
      orgId,
      name: 'Counter Test',
      role: UserRole.USER,
      emailVerified: false,
      hasAcceptedMarketing: false,
      department: 'bauamt',
    });

    const result = await useCase.execute(commandWithDept);

    expect(publishUserCreated.publish).toHaveBeenCalledWith(
      expect.objectContaining({ id: result.id, department: 'bauamt' }),
    );
  });

  it('should not emit UserCreatedEvent when user already exists', async () => {
    usersRepository.findOneByEmail.mockResolvedValue(
      new User({
        email: validCommand.email,
        emailVerified: false,
        passwordHash: 'existing-hash',
        role: UserRole.USER,
        orgId,
        name: 'Existing User',
        hasAcceptedMarketing: false,
      }),
    );

    await expect(useCase.execute(validCommand)).rejects.toThrow(
      UserAlreadyExistsError,
    );
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });

  it('should not emit UserCreatedEvent when email provider is blacklisted', async () => {
    const blacklistedCommand = new CreateUserCommand({
      ...validCommand,
      email: 'user@tempmail.com',
    });

    await expect(useCase.execute(blacklistedCommand)).rejects.toThrow(
      UserEmailProviderBlacklistedError,
    );
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });

  it('should pass department from command to the created user entity', async () => {
    const commandWithDepartment = new CreateUserCommand({
      email: 'maria.garcia@ayunis.de',
      password: 'Sicher3sPasswort!',
      orgId,
      name: 'Maria Garcia',
      role: UserRole.USER,
      emailVerified: false,
      hasAcceptedMarketing: true,
      department: 'bauamt',
    });

    const result = await useCase.execute(commandWithDepartment);

    expect(result.department).toBe('bauamt');
    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'bauamt' }),
    );
  });

  it('should not emit UserCreatedEvent when repository create fails', async () => {
    usersRepository.create.mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(validCommand)).rejects.toThrow();
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });

  it('can defer publishing to an outer transaction boundary', async () => {
    const result = await useCase.createWithoutPublishing(validCommand);

    expect(result.email).toBe(validCommand.email);
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });

  it('can prepare a user before persisting it', async () => {
    const preparedUser = await useCase.prepare(validCommand);

    expect(preparedUser.passwordHash).toBe('hashed-password-value');
    expect(usersRepository.create).not.toHaveBeenCalled();

    const result = await useCase.createPreparedWithoutPublishing(preparedUser);

    expect(result).toBe(preparedUser);
    expect(usersRepository.create).toHaveBeenCalledWith(preparedUser);
    expect(publishUserCreated.publish).not.toHaveBeenCalled();
  });
});
