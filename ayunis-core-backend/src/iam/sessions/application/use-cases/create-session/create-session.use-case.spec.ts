import { Logger } from '@nestjs/common';
import { CreateSessionUseCase } from './create-session.use-case';
import { CreateSessionCommand } from './create-session.command';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
  TEST_USER_ID,
} from '../../testing/refresh-token.fixtures';
import { SessionAuthenticationMethod } from '../../../domain/value-objects/session-authentication-method.enum';

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

  it('stores the authentication method on a new session family', async () => {
    const result = await useCase.execute(
      new CreateSessionCommand(TEST_USER_ID, SessionAuthenticationMethod.SSO),
    );

    expect(result.refreshToken).toBe('plaintext');
    expect(factory.create).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      familyId: TEST_FAMILY_ID,
      authenticationMethod: SessionAuthenticationMethod.SSO,
    });
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });
});
