import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { AdminUpdateUserUseCase } from './admin-update-user.use-case';
import { AdminUpdateUserCommand } from './admin-update-user.command';
import { ContextService } from 'src/common/context/services/context.service';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UserUpdatedEvent } from '../../events/user-updated.event';
import { SendConfirmationEmailUseCase } from '../send-confirmation-email/send-confirmation-email.use-case';
import {
  UserAlreadyExistsError,
  UserInvalidInputError,
  UserNotFoundError,
  UserUnauthorizedError,
} from '../../users.errors';

describe('AdminUpdateUserUseCase', () => {
  let useCase: AdminUpdateUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockContextService: Partial<ContextService>;
  let mockEventEmitter: { emitAsync: jest.Mock };
  let mockSendConfirmationEmailUseCase: { execute: jest.Mock };

  const targetUserId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const orgId = '660e8400-e29b-41d4-a716-446655440000' as UUID;
  const otherOrgId = '770e8400-e29b-41d4-a716-446655440000' as UUID;

  const buildTargetUser = (overrides: Partial<User> = {}): User =>
    new User({
      id: targetUserId,
      email: 'maria.mueller@gemeinde.de',
      emailVerified: true,
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      orgId,
      name: 'Maria Müller',
      hasAcceptedMarketing: false,
      ...overrides,
    });

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      findOneByEmail: jest.fn(),
      update: jest.fn(),
    };
    mockContextService = {
      get: jest.fn(),
    };
    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };
    mockSendConfirmationEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUpdateUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        {
          provide: SendConfirmationEmailUseCase,
          useValue: mockSendConfirmationEmailUseCase,
        },
      ],
    }).compile();

    useCase = module.get<AdminUpdateUserUseCase>(AdminUpdateUserUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(mockContextService, 'get').mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      return undefined;
    });
  });

  it('should update both name and email and emit UserUpdatedEvent', async () => {
    const targetUser = buildTargetUser();
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(targetUser);
    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(null);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockImplementation(async (u) => u);

    const command = new AdminUpdateUserCommand(
      targetUserId,
      'Maria Schmidt',
      'maria.schmidt@gemeinde.de',
    );

    const result = await useCase.execute(command);

    expect(result.name).toBe('Maria Schmidt');
    expect(result.email).toBe('maria.schmidt@gemeinde.de');
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      UserUpdatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: targetUserId,
        orgId,
      }),
    );
  });

  it('should reset emailVerified and send a confirmation email when admin changes the email', async () => {
    const targetUser = buildTargetUser({ emailVerified: true });
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(targetUser);
    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(null);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockImplementation(async (u) => u);

    const command = new AdminUpdateUserCommand(
      targetUserId,
      undefined,
      'maria.schmidt@gemeinde.de',
    );

    const result = await useCase.execute(command);

    expect(result.emailVerified).toBe(false);
    expect(mockSendConfirmationEmailUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: targetUserId,
          email: 'maria.schmidt@gemeinde.de',
          emailVerified: false,
        }),
      }),
    );
  });

  it('should not send a confirmation email when the email is unchanged', async () => {
    const targetUser = buildTargetUser({ emailVerified: true });
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(targetUser);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockImplementation(async (u) => u);

    const command = new AdminUpdateUserCommand(targetUserId, 'Maria Schmidt');

    const result = await useCase.execute(command);

    expect(result.emailVerified).toBe(true);
    expect(mockSendConfirmationEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it('should update name only when email is omitted', async () => {
    const targetUser = buildTargetUser();
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(targetUser);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockImplementation(async (u) => u);

    const command = new AdminUpdateUserCommand(targetUserId, 'Maria Schmidt');

    const result = await useCase.execute(command);

    expect(result.name).toBe('Maria Schmidt');
    expect(result.email).toBe('maria.mueller@gemeinde.de');
    expect(mockUsersRepository.findOneByEmail).not.toHaveBeenCalled();
  });

  it('should skip the uniqueness check when email is unchanged', async () => {
    const targetUser = buildTargetUser();
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(targetUser);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockImplementation(async (u) => u);

    const command = new AdminUpdateUserCommand(
      targetUserId,
      undefined,
      targetUser.email,
    );

    await useCase.execute(command);

    expect(mockUsersRepository.findOneByEmail).not.toHaveBeenCalled();
  });

  it('should throw UserInvalidInputError when both fields are omitted', async () => {
    const command = new AdminUpdateUserCommand(targetUserId);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserInvalidInputError,
    );
    expect(mockUsersRepository.findOneById).not.toHaveBeenCalled();
  });

  it('should throw UserNotFoundError when the target user does not exist', async () => {
    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    const command = new AdminUpdateUserCommand(targetUserId, 'New Name');

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should reject cross-org updates with UserUnauthorizedError', async () => {
    const targetUser = buildTargetUser({ orgId: otherOrgId });
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(targetUser);

    const command = new AdminUpdateUserCommand(targetUserId, 'New Name');

    await expect(useCase.execute(command)).rejects.toThrow(
      UserUnauthorizedError,
    );
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should throw UserAlreadyExistsError when the new email is taken by another user', async () => {
    const targetUser = buildTargetUser();
    const otherUser = new User({
      id: '880e8400-e29b-41d4-a716-446655440000',
      email: 'taken@gemeinde.de',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId,
      name: 'Other',
      hasAcceptedMarketing: false,
    });
    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue(targetUser);
    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(otherUser);

    const command = new AdminUpdateUserCommand(
      targetUserId,
      undefined,
      'taken@gemeinde.de',
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UserAlreadyExistsError,
    );
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should throw UserUnauthorizedError when the requester has no orgId in context', async () => {
    jest.spyOn(mockContextService, 'get').mockReturnValue(undefined);

    const command = new AdminUpdateUserCommand(targetUserId, 'New Name');

    await expect(useCase.execute(command)).rejects.toThrow(
      UserUnauthorizedError,
    );
    expect(mockUsersRepository.findOneById).not.toHaveBeenCalled();
  });
});
