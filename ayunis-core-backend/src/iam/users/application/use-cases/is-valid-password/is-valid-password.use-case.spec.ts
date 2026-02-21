import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { IsValidPasswordUseCase } from './is-valid-password.use-case';
import { IsValidPasswordQuery } from './is-valid-password.query';
import { UsersRepository } from '../../ports/users.repository';

describe('IsValidPasswordUseCase', () => {
  let useCase: IsValidPasswordUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeAll(async () => {
    mockUsersRepository = {
      isValidPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsValidPasswordUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<IsValidPasswordUseCase>(IsValidPasswordUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return true for valid password', async () => {
    const query = new IsValidPasswordQuery('ValidPassword123!');

    jest.spyOn(mockUsersRepository, 'isValidPassword').mockResolvedValue(true);

    const result = await useCase.execute(query);

    expect(result).toBe(true);
    expect(mockUsersRepository.isValidPassword).toHaveBeenCalledWith(
      'ValidPassword123!',
    );
  });

  it('should return false for invalid password', async () => {
    const query = new IsValidPasswordQuery('weak');

    jest.spyOn(mockUsersRepository, 'isValidPassword').mockResolvedValue(false);

    const result = await useCase.execute(query);

    expect(result).toBe(false);
    expect(mockUsersRepository.isValidPassword).toHaveBeenCalledWith('weak');
  });
});
