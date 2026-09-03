import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UserInvalidInputError } from 'src/iam/users/application/users.errors';
import { TriggerPasswordResetUseCase } from 'src/iam/users/application/use-cases/trigger-password-reset/trigger-password-reset.use-case';
import { AdminTriggerPasswordResetCommand } from './admin-trigger-password-reset.command';
import { AdminTriggerPasswordResetUseCase } from './admin-trigger-password-reset.use-case';

describe('AdminTriggerPasswordResetUseCase', () => {
  let useCase: AdminTriggerPasswordResetUseCase;
  let contextService: Partial<ContextService>;
  let usersRepository: Partial<UsersRepository>;
  let triggerPasswordResetUseCase: Partial<TriggerPasswordResetUseCase>;

  const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const orgId = '660e8400-e29b-41d4-a716-446655440000' as UUID;

  const buildUser = (passwordHash: string | null) =>
    new User({
      id: userId,
      name: 'Maria Müller',
      email: 'maria.mueller@gemeinde.de',
      emailVerified: true,
      passwordHash,
      role: UserRole.USER,
      orgId,
      hasAcceptedMarketing: false,
    });

  beforeAll(async () => {
    contextService = { get: jest.fn() };
    usersRepository = { findOneById: jest.fn() };
    triggerPasswordResetUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminTriggerPasswordResetUseCase,
        { provide: ContextService, useValue: contextService },
        { provide: UsersRepository, useValue: usersRepository },
        {
          provide: TriggerPasswordResetUseCase,
          useValue: triggerPasswordResetUseCase,
        },
      ],
    }).compile();

    useCase = module.get(AdminTriggerPasswordResetUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(contextService, 'get').mockReturnValue(orgId);
  });

  it('delegates reset for a user with a local password', async () => {
    const user = buildUser('hashed-password');
    jest.spyOn(usersRepository, 'findOneById').mockResolvedValue(user);
    jest
      .spyOn(triggerPasswordResetUseCase, 'execute')
      .mockResolvedValue(undefined);

    await useCase.execute(new AdminTriggerPasswordResetCommand(userId));

    expect(triggerPasswordResetUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ email: user.email }),
    );
  });

  it('rejects reset for a user without a local password', async () => {
    jest
      .spyOn(usersRepository, 'findOneById')
      .mockResolvedValue(buildUser(null));

    await expect(
      useCase.execute(new AdminTriggerPasswordResetCommand(userId)),
    ).rejects.toThrow(UserInvalidInputError);

    expect(triggerPasswordResetUseCase.execute).not.toHaveBeenCalled();
  });
});
