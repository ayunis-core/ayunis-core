import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ValidateUserUseCase } from './validate-user.use-case';
import { ValidateUserQuery } from './validate-user.query';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { aUser } from 'src/iam/users/application/testing/user.fixtures';
import {
  UserNotFoundError,
  UserAuthenticationFailedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { ConfigService } from '@nestjs/config';

describe('ValidateUserUseCase', () => {
  let useCase: ValidateUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockCompareHashUseCase: Partial<CompareHashUseCase>;
  let mockConfigService: { get: jest.Mock };

  beforeAll(async () => {
    mockUsersRepository = {
      findOneByEmail: jest.fn(),
      registerFailedLoginAttempt: jest.fn(),
    };
    mockCompareHashUseCase = {
      execute: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: CompareHashUseCase, useValue: mockCompareHashUseCase },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getLoggerToken(ValidateUserUseCase.name),
          useValue: createPinoLoggerMock(),
        },
      ],
    }).compile();

    useCase = module.get<ValidateUserUseCase>(ValidateUserUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation(
      (_key: string, defaultValue: unknown) => defaultValue,
    );
  });

  afterEach(() => jest.useRealTimers());

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should validate user successfully', async () => {
    const query = new ValidateUserQuery('test@example.com', 'password123');
    const mockUser = aUser();

    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(mockUser);
    jest.spyOn(mockCompareHashUseCase, 'execute').mockResolvedValue(true);

    const result = await useCase.execute(query);

    expect(result).toBe(mockUser);
    expect(mockUsersRepository.findOneByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(mockCompareHashUseCase.execute).toHaveBeenCalled();
    expect(
      mockUsersRepository.registerFailedLoginAttempt,
    ).not.toHaveBeenCalled();
  });

  it('should throw UserNotFoundError if user not found', async () => {
    const query = new ValidateUserQuery('test@example.com', 'password123');

    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(null);

    await expect(useCase.execute(query)).rejects.toThrow(UserNotFoundError);
  });

  it('should throw UserAuthenticationFailedError if password is invalid', async () => {
    const query = new ValidateUserQuery('test@example.com', 'wrongpassword');
    const mockUser = aUser();

    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(mockUser);
    jest.spyOn(mockCompareHashUseCase, 'execute').mockResolvedValue(false);
    jest
      .spyOn(mockUsersRepository, 'registerFailedLoginAttempt')
      .mockResolvedValue(1);

    await expect(useCase.execute(query)).rejects.toThrow(
      UserAuthenticationFailedError,
    );
    expect(mockUsersRepository.registerFailedLoginAttempt).toHaveBeenCalled();
  });

  it('surfaces a hash comparison failure as an unexpected user error', async () => {
    const query = new ValidateUserQuery('test@example.com', 'password123');
    const mockUser = aUser();
    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(mockUser);
    jest
      .spyOn(mockCompareHashUseCase, 'execute')
      .mockRejectedValue(new Error('Hash service unavailable'));

    await expect(useCase.execute(query)).rejects.toThrow(UserUnexpectedError);
  });

  it('rejects local login for a federated-only user without comparing a hash', async () => {
    const query = new ValidateUserQuery(
      'maria.muster@stadt-koeln.de',
      'password123',
    );
    const federatedUser = aUser({
      email: 'maria.muster@stadt-koeln.de',
      emailVerified: true,
      passwordHash: null,
      name: 'Maria Muster',
    });
    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(federatedUser);

    await expect(useCase.execute(query)).rejects.toThrow(
      UserAuthenticationFailedError,
    );
    expect(mockCompareHashUseCase.execute).not.toHaveBeenCalled();
    expect(
      mockUsersRepository.registerFailedLoginAttempt,
    ).not.toHaveBeenCalled();
  });

  it('rejects a locked account without comparing or recording a password', async () => {
    const user = aUser({
      lockedAt: new Date('2026-08-24T10:00:00.000Z'),
    });
    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(user);

    await expect(
      useCase.execute(new ValidateUserQuery(user.email, 'password123')),
    ).rejects.toThrow(UserAuthenticationFailedError);

    expect(mockCompareHashUseCase.execute).not.toHaveBeenCalled();
    expect(
      mockUsersRepository.registerFailedLoginAttempt,
    ).not.toHaveBeenCalled();
  });

  it('records an invalid password using the configured threshold and window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-24T10:00:00.000Z'));
    const user = aUser();
    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(user);
    jest.spyOn(mockCompareHashUseCase, 'execute').mockResolvedValue(false);
    jest
      .spyOn(mockUsersRepository, 'registerFailedLoginAttempt')
      .mockResolvedValue(6);
    mockConfigService.get.mockImplementation((key: string) =>
      key.endsWith('maxAttempts') ? 6 : 20,
    );

    await expect(
      useCase.execute(new ValidateUserQuery(user.email, 'wrong-password')),
    ).rejects.toThrow(UserAuthenticationFailedError);

    expect(mockUsersRepository.registerFailedLoginAttempt).toHaveBeenCalledWith(
      user.id,
      new Date('2026-08-24T10:00:00.000Z'),
      new Date('2026-08-24T09:40:00.000Z'),
      6,
    );
  });

  it('surfaces a failed lockout write as an unexpected user error', async () => {
    const user = aUser();
    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(user);
    jest.spyOn(mockCompareHashUseCase, 'execute').mockResolvedValue(false);
    jest
      .spyOn(mockUsersRepository, 'registerFailedLoginAttempt')
      .mockRejectedValue(new Error('database unavailable'));

    await expect(
      useCase.execute(new ValidateUserQuery(user.email, 'wrong-password')),
    ).rejects.toThrow(UserUnexpectedError);
  });
});
