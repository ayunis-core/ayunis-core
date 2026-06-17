import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfirmEmailUseCase } from './confirm-email.use-case';
import { ConfirmEmailCommand } from './confirm-email.command';
import { UserUpdatedEvent } from '../../events/user-updated.event';
import { UsersRepository } from '../../ports/users.repository';
import { EmailConfirmationJwtService } from '../../services/email-confirmation-jwt.service';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import {
  InvalidEmailConfirmationTokenError,
  UserNotFoundError,
  UserEmailMismatchError,
} from '../../users.errors';
import type { UUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

const USER_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as UUID;
const EMAIL = 'maria.schmidt@example.com';

function makeUser(): User {
  return new User({
    id: USER_ID,
    email: EMAIL,
    emailVerified: false,
    passwordHash: 'hashed-password',
    role: UserRole.USER,
    orgId: ORG_ID,
    name: 'Maria Schmidt',
    hasAcceptedMarketing: false,
  });
}

describe('ConfirmEmailUseCase', () => {
  let useCase: ConfirmEmailUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockJwtService: Partial<EmailConfirmationJwtService>;
  let mockEventEmitter: { emitAsync: jest.Mock };

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    mockJwtService = {
      verifyEmailConfirmationToken: jest.fn(),
    };
    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmEmailUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        {
          provide: EmailConfirmationJwtService,
          useValue: mockJwtService,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<ConfirmEmailUseCase>(ConfirmEmailUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should confirm email and set emailVerified to true', async () => {
    const command = new ConfirmEmailCommand('valid-token');
    const mockUser = makeUser();

    jest
      .spyOn(mockJwtService, 'verifyEmailConfirmationToken')
      .mockReturnValue({ userId: USER_ID, email: EMAIL });
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(mockUser);

    await useCase.execute(command);

    expect(mockUser.emailVerified).toBe(true);
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
  });

  it('should emit UserUpdatedEvent after successful confirmation', async () => {
    const command = new ConfirmEmailCommand('valid-token');
    const mockUser = makeUser();

    jest
      .spyOn(mockJwtService, 'verifyEmailConfirmationToken')
      .mockReturnValue({ userId: USER_ID, email: EMAIL });
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(mockUser);

    await useCase.execute(command);

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      UserUpdatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: mockUser.id,
        orgId: mockUser.orgId,
        user: mockUser,
      }),
    );
  });

  it('should throw InvalidEmailConfirmationTokenError when token is invalid', async () => {
    const command = new ConfirmEmailCommand('invalid-token');

    jest
      .spyOn(mockJwtService, 'verifyEmailConfirmationToken')
      .mockImplementation(() => {
        throw new Error('jwt malformed');
      });

    await expect(useCase.execute(command)).rejects.toThrow(
      InvalidEmailConfirmationTokenError,
    );
    expect(mockUsersRepository.findOneById).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should throw UserNotFoundError when user does not exist', async () => {
    const command = new ConfirmEmailCommand('valid-token');

    jest
      .spyOn(mockJwtService, 'verifyEmailConfirmationToken')
      .mockReturnValue({ userId: USER_ID, email: EMAIL });
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should throw UserEmailMismatchError when email does not match', async () => {
    const command = new ConfirmEmailCommand('valid-token');
    const mockUser = makeUser();

    jest
      .spyOn(mockJwtService, 'verifyEmailConfirmationToken')
      .mockReturnValue({ userId: USER_ID, email: 'other@example.com' });
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserEmailMismatchError,
    );
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should not emit event when repository update fails', async () => {
    const command = new ConfirmEmailCommand('valid-token');
    const mockUser = makeUser();

    jest
      .spyOn(mockJwtService, 'verifyEmailConfirmationToken')
      .mockReturnValue({ userId: USER_ID, email: EMAIL });
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockRejectedValue(new Error('Database write failed'));

    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
