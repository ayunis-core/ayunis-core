import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { PromoteToSuperAdminUseCase } from './promote-to-super-admin.use-case';
import { PromoteToSuperAdminCommand } from './promote-to-super-admin.command';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';
import { UserNotFoundError } from '../../users.errors';

describe('PromoteToSuperAdminUseCase', () => {
  let useCase: PromoteToSuperAdminUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeAll(async () => {
    mockUsersRepository = {
      findOneByEmail: jest.fn(),
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoteToSuperAdminUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<PromoteToSuperAdminUseCase>(
      PromoteToSuperAdminUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should promote user to super admin', async () => {
    const command = new PromoteToSuperAdminCommand({
      email: 'test@example.com',
    });
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      orgId: 'org-id' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });

    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(mockUser);

    const result = await useCase.execute(command);

    expect(mockUsersRepository.findOneByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(mockUser.systemRole).toBe(SystemRole.SUPER_ADMIN);
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
    expect(result).toBe(mockUser);
  });

  it('should throw UserNotFoundError when user not found', async () => {
    const command = new PromoteToSuperAdminCommand({
      email: 'notfound@example.com',
    });

    jest.spyOn(mockUsersRepository, 'findOneByEmail').mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should return early without DB write when user is already super admin', async () => {
    const command = new PromoteToSuperAdminCommand({
      email: 'admin@example.com',
    });
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'admin@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      systemRole: SystemRole.SUPER_ADMIN,
      orgId: 'org-id' as UUID,
      name: 'Admin User',
      hasAcceptedMarketing: false,
    });

    jest
      .spyOn(mockUsersRepository, 'findOneByEmail')
      .mockResolvedValue(mockUser);

    const result = await useCase.execute(command);

    expect(mockUser.systemRole).toBe(SystemRole.SUPER_ADMIN);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });
});
