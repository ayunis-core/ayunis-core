import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { DemoteFromSuperAdminUseCase } from './demote-from-super-admin.use-case';
import { DemoteFromSuperAdminCommand } from './demote-from-super-admin.command';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';
import {
  UserNotFoundError,
  UserNotSuperAdminError,
  UserSelfDemotionNotAllowedError,
  UserLastSuperAdminError,
} from '../../users.errors';

describe('DemoteFromSuperAdminUseCase', () => {
  let useCase: DemoteFromSuperAdminUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      findManyBySystemRole: jest.fn(),
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemoteFromSuperAdminUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<DemoteFromSuperAdminUseCase>(
      DemoteFromSuperAdminUseCase,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should demote user from super admin', async () => {
    const command = new DemoteFromSuperAdminCommand({
      userId: 'target-user-id' as UUID,
      requestingUserId: 'requesting-user-id' as UUID,
    });
    const mockUser = new User({
      id: 'target-user-id' as UUID,
      email: 'test@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      systemRole: SystemRole.SUPER_ADMIN,
      orgId: 'org-id' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });

    const anotherAdmin = new User({
      id: 'other-admin-id' as UUID,
      email: 'other@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      systemRole: SystemRole.SUPER_ADMIN,
      orgId: 'org-id' as UUID,
      name: 'Other Admin',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest
      .spyOn(mockUsersRepository, 'findManyBySystemRole')
      .mockResolvedValue([mockUser, anotherAdmin]);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(mockUser);

    await useCase.execute(command);

    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith(
      'target-user-id',
    );
    expect(mockUser.systemRole).toBe(SystemRole.CUSTOMER);
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
  });

  it('should throw UserSelfDemotionNotAllowedError on self-demotion', async () => {
    const command = new DemoteFromSuperAdminCommand({
      userId: 'same-user-id' as UUID,
      requestingUserId: 'same-user-id' as UUID,
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      UserSelfDemotionNotAllowedError,
    );
    expect(mockUsersRepository.findOneById).not.toHaveBeenCalled();
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should throw UserNotSuperAdminError when user is not a super admin', async () => {
    const command = new DemoteFromSuperAdminCommand({
      userId: 'target-user-id' as UUID,
      requestingUserId: 'requesting-user-id' as UUID,
    });
    const mockUser = new User({
      id: 'target-user-id' as UUID,
      email: 'regular@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      orgId: 'org-id' as UUID,
      name: 'Regular User',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserNotSuperAdminError,
    );
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should throw UserLastSuperAdminError when demoting the last super admin', async () => {
    const command = new DemoteFromSuperAdminCommand({
      userId: 'target-user-id' as UUID,
      requestingUserId: 'requesting-user-id' as UUID,
    });
    const mockUser = new User({
      id: 'target-user-id' as UUID,
      email: 'admin@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      systemRole: SystemRole.SUPER_ADMIN,
      orgId: 'org-id' as UUID,
      name: 'Last Admin',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest
      .spyOn(mockUsersRepository, 'findManyBySystemRole')
      .mockResolvedValue([mockUser]);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserLastSuperAdminError,
    );
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should throw UserNotFoundError when user not found', async () => {
    const command = new DemoteFromSuperAdminCommand({
      userId: 'nonexistent-id' as UUID,
      requestingUserId: 'requesting-user-id' as UUID,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(UserNotFoundError);
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });
});
