import { Logger } from '@nestjs/common';
import { CreateSessionUseCase } from './create-session.use-case';
import { CreateSessionCommand } from './create-session.command';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
  TEST_USER_ID,
} from '../../testing/refresh-token.fixtures';

describe('CreateSessionUseCase', () => {
  let useCase: CreateSessionUseCase;
  let repository: ReturnType<typeof createMockRefreshTokensRepository>;
  let factory: { create: jest.Mock; newFamilyId: jest.Mock };

  beforeEach(() => {
    repository = createMockRefreshTokensRepository();
    factory = {
      create: jest.fn().mockReturnValue({
        token: aRefreshToken(),
        plaintext: 'plaintext',
      }),
      newFamilyId: jest.fn().mockReturnValue(TEST_FAMILY_ID),
    };
    useCase = new CreateSessionUseCase(repository, factory as never);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should insert a token in a new family and return the plaintext', async () => {
    const result = await useCase.execute(
      new CreateSessionCommand(TEST_USER_ID),
    );

    expect(result.refreshToken).toBe('plaintext');
    expect(factory.create).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      familyId: TEST_FAMILY_ID,
    });
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });
});
