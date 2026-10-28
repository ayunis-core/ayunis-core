import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import { CreateSessionCommand } from 'src/iam/sessions/application/use-cases/create-session/create-session.command';
import {
  aRefreshToken,
  createMockRefreshTokensRepository,
  TEST_FAMILY_ID,
  TEST_USER_ID,
} from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

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
  });

  afterEach(() => jest.clearAllMocks());

  it('stores SSO provenance on a new session family', async () => {
    const result = await useCase.execute(
      new CreateSessionCommand(
        TEST_USER_ID,
        SessionAuthenticationMethod.SSO,
        'zitadel-session-id',
      ),
    );

    expect(result.refreshToken).toBe('plaintext');
    expect(factory.create).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      familyId: TEST_FAMILY_ID,
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session-id',
    });
    expect(repository.insert).toHaveBeenCalledTimes(1);
  });
});
