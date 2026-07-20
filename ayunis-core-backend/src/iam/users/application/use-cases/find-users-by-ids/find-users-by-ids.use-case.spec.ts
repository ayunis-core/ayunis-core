import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindUsersByIdsUseCase } from './find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from './find-users-by-ids.query';
import { UsersRepository } from '../../ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('FindUsersByIdsUseCase', () => {
  let useCase: FindUsersByIdsUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockContextService: Partial<ContextService>;

  const ORG_ID = 'org-id' as UUID;
  const userInOrg = new User({
    id: 'user-1' as UUID,
    name: 'Alice',
    email: 'alice@example.com',
    emailVerified: true,
    passwordHash: 'hash',
    role: UserRole.USER,
    orgId: ORG_ID,
    hasAcceptedMarketing: false,
  });

  beforeAll(async () => {
    mockUsersRepository = {
      findManyByIdsAndOrgId: jest.fn(),
    };
    mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUsersByIdsUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<FindUsersByIdsUseCase>(FindUsersByIdsUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('passes the caller orgId from ContextService into the repository', async () => {
    (mockContextService.get as jest.Mock).mockReturnValue(ORG_ID);
    (mockUsersRepository.findManyByIdsAndOrgId as jest.Mock).mockResolvedValue([
      userInOrg,
    ]);

    const result = await useCase.execute(
      new FindUsersByIdsQuery([userInOrg.id]),
    );

    expect(mockContextService.get).toHaveBeenCalledWith('orgId');
    expect(mockUsersRepository.findManyByIdsAndOrgId).toHaveBeenCalledWith(
      [userInOrg.id],
      ORG_ID,
    );
    expect(result).toEqual([userInOrg]);
  });

  it('throws UnauthorizedAccessError when orgId is missing from context', async () => {
    (mockContextService.get as jest.Mock).mockReturnValue(undefined);

    await expect(
      useCase.execute(new FindUsersByIdsQuery([userInOrg.id])),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);

    expect(mockUsersRepository.findManyByIdsAndOrgId).not.toHaveBeenCalled();
  });
});
