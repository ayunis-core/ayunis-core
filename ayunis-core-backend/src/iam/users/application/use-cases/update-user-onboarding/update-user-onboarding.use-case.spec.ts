import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateUserOnboardingUseCase } from './update-user-onboarding.use-case';
import { UpdateUserOnboardingCommand } from './update-user-onboarding.command';
import { UserUpdatedEvent } from '../../events/user-updated.event';
import { UserNotFoundError } from '../../users.errors';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('UpdateUserOnboardingUseCase', () => {
  let useCase: UpdateUserOnboardingUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockEventEmitter: { emitAsync: jest.Mock };

  const buildUser = () =>
    new User({
      id: 'user-id' as UUID,
      email: 'maria.schmidt@stadt-koeln.de',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'Maria Schmidt',
      hasAcceptedMarketing: false,
    });

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserOnboardingUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<UpdateUserOnboardingUseCase>(
      UpdateUserOnboardingUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should persist completed step ids and hidden flag on the user', async () => {
    const command = new UpdateUserOnboardingCommand(
      'user-id' as UUID,
      ['create-assistant', 'start-chat'],
      true,
    );
    const user = buildUser();

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(user);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(user);

    await useCase.execute(command);

    expect(user.onboardingCompletedStepIds).toEqual([
      'create-assistant',
      'start-chat',
    ]);
    expect(user.onboardingHidden).toBe(true);
    expect(mockUsersRepository.update).toHaveBeenCalledWith(user);
  });

  it('should return the updated user', async () => {
    const command = new UpdateUserOnboardingCommand(
      'user-id' as UUID,
      [],
      false,
    );
    const user = buildUser();

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(user);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(user);

    const result = await useCase.execute(command);

    expect(result).toBe(user);
  });

  it('should emit UserUpdatedEvent after a successful update', async () => {
    const command = new UpdateUserOnboardingCommand(
      'user-id' as UUID,
      ['create-assistant'],
      false,
    );
    const user = buildUser();

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(user);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(user);

    await useCase.execute(command);

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      UserUpdatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: user.id,
        orgId: user.orgId,
        user,
      }),
    );
  });

  it('should throw UserNotFoundError when the user does not exist', async () => {
    const command = new UpdateUserOnboardingCommand(
      'missing-id' as UUID,
      [],
      false,
    );

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should not emit an event when the update fails', async () => {
    const command = new UpdateUserOnboardingCommand(
      'user-id' as UUID,
      ['create-assistant'],
      false,
    );
    const user = buildUser();

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(user);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockRejectedValue(new Error('Update failed'));

    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
