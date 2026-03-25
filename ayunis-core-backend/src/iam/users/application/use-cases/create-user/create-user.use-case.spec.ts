import { CreateUserUseCase } from './create-user.use-case';
import { CreateUserCommand } from './create-user.command';
import { UserCreatedEvent } from '../../events/user-created.event';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import {
  UserAlreadyExistsError,
  UserEmailProviderBlacklistedError,
} from '../../users.errors';
import type { UsersRepository } from '../../ports/users.repository';
import type { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let usersRepository: jest.Mocked<UsersRepository>;
  let hashTextUseCase: jest.Mocked<HashTextUseCase>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

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

    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;

    useCase = new CreateUserUseCase(
      usersRepository,
      hashTextUseCase,
      configService,
      eventEmitter,
    );
  });

  it('should emit UserCreatedEvent with enriched data after user creation', async () => {
    const result = await useCase.execute(validCommand);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      UserCreatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: result.id,
        orgId,
        user: result,
        department: undefined,
      }),
    );
  });

  it('should include department in UserCreatedEvent', async () => {
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

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      UserCreatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: result.id,
        orgId,
        user: result,
        department: 'bauamt',
      }),
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
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should not emit UserCreatedEvent when email provider is blacklisted', async () => {
    const blacklistedCommand = new CreateUserCommand({
      ...validCommand,
      email: 'user@tempmail.com',
    });

    await expect(useCase.execute(blacklistedCommand)).rejects.toThrow(
      UserEmailProviderBlacklistedError,
    );
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should catch and log emitAsync rejection without throwing', async () => {
    eventEmitter.emitAsync.mockRejectedValue(
      new Error('Listener failed unexpectedly'),
    );

    const result = await useCase.execute(validCommand);

    expect(result).toBeDefined();
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      UserCreatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: result.id,
        orgId,
      }),
    );

    // Flush microtask queue so the .catch() handler runs
    await new Promise(process.nextTick);
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
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
