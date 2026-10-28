import { AssertCachedOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-cached-org-active/assert-cached-org-active.use-case';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import type { Request } from 'express';
import { ApiKeyStrategy } from './api-key.strategy';
import { ValidateApiKeyUseCase } from 'src/iam/api-keys/application/use-cases/validate-api-key/validate-api-key.use-case';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import {
  ApiKeyExpiredError,
  ApiKeyNotFoundError,
  UnexpectedApiKeyError,
} from 'src/iam/api-keys/application/api-keys.errors';

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;
  let validateApiKey: jest.Mocked<ValidateApiKeyUseCase>;

  const orgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const apiKeyId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const token = `${ApiKey.KEY_PREFIX}abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH`;

  const bearer = (value: string) =>
    ({ headers: { authorization: value } }) as unknown as Request;

  type AuthOutcome = { user: unknown } | 'fail';

  // Drives the strategy through passport's real authenticate() path, so
  // the test covers where the token is read from, not just validate().
  const authenticate = (req: Partial<Request>): Promise<AuthOutcome> =>
    new Promise((resolve, reject) => {
      const s = strategy as unknown as {
        success: (user: unknown) => void;
        fail: () => void;
        error: (err: unknown) => void;
        authenticate: (req: Partial<Request>) => void;
      };
      s.success = (user) => resolve({ user });
      s.fail = () => resolve('fail');
      s.error = reject;
      s.authenticate({ headers: {}, query: {}, body: {}, ...req });
    });

  beforeEach(async () => {
    const mockValidateApiKey = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        {
          provide: AssertCachedOrgActiveUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue({ sessionVersion: 0 }),
          },
        },
        { provide: ValidateApiKeyUseCase, useValue: mockValidateApiKey },
      ],
    }).compile();

    strategy = module.get(ApiKeyStrategy);
    validateApiKey = module.get(ValidateApiKeyUseCase);
  });

  it('returns the principal on a valid token', async () => {
    validateApiKey.execute.mockResolvedValue(
      new ApiKey({
        id: apiKeyId,
        name: 'CI bot',
        prefix: 'abcdefghijkl',
        hash: 'stored-bcrypt-hash',
        orgId,
        createdByUserId: null,
        expiresAt: null,
        revokedAt: null,
      }),
    );

    await expect(strategy.validate(bearer(`Bearer ${token}`))).resolves.toEqual(
      {
        apiKeyId,
        orgId,
      },
    );
  });

  it('returns false when the key is not found (collapsed unknown/mismatch/revoked)', async () => {
    validateApiKey.execute.mockRejectedValue(new ApiKeyNotFoundError());

    await expect(strategy.validate(bearer(`Bearer ${token}`))).resolves.toBe(
      false,
    );
  });

  it('returns false when the key is expired', async () => {
    validateApiKey.execute.mockRejectedValue(new ApiKeyExpiredError());

    await expect(strategy.validate(bearer(`Bearer ${token}`))).resolves.toBe(
      false,
    );
  });

  it('rethrows infrastructure failures so they surface as 500, not 401', async () => {
    validateApiKey.execute.mockRejectedValue(new UnexpectedApiKeyError());

    await expect(strategy.validate(bearer(`Bearer ${token}`))).rejects.toThrow(
      UnexpectedApiKeyError,
    );
  });

  it('rethrows non-ApplicationError exceptions', async () => {
    validateApiKey.execute.mockRejectedValue(new Error('boom'));

    await expect(strategy.validate(bearer(`Bearer ${token}`))).rejects.toThrow(
      'boom',
    );
  });

  describe('token source', () => {
    beforeEach(() => {
      validateApiKey.execute.mockResolvedValue(
        new ApiKey({
          id: apiKeyId,
          name: 'CI bot',
          prefix: 'abcdefghijkl',
          hash: 'stored-bcrypt-hash',
          orgId,
          createdByUserId: null,
          expiresAt: null,
          revokedAt: null,
        }),
      );
    });

    it('authenticates from the Authorization: Bearer header', async () => {
      await expect(
        authenticate({ headers: { authorization: `Bearer ${token}` } }),
      ).resolves.toEqual({ user: { apiKeyId, orgId } });
      expect(validateApiKey.execute).toHaveBeenCalledWith(
        expect.objectContaining({ token }),
      );
    });

    it('accepts the scheme case-insensitively', async () => {
      await expect(
        authenticate({ headers: { authorization: `bearer ${token}` } }),
      ).resolves.toEqual({ user: { apiKeyId, orgId } });
    });

    it('rejects a valid key passed as ?access_token=', async () => {
      await expect(
        authenticate({ query: { access_token: token } }),
      ).resolves.toBe('fail');
      expect(validateApiKey.execute).not.toHaveBeenCalled();
    });

    it('rejects a valid key passed as body.access_token', async () => {
      await expect(
        authenticate({ body: { access_token: token } }),
      ).resolves.toBe('fail');
      expect(validateApiKey.execute).not.toHaveBeenCalled();
    });

    it.each([
      ['missing', undefined],
      ['empty', ''],
      ['non-bearer scheme', `Basic ${token}`],
      ['scheme without token', 'Bearer '],
      ['extra parts', `Bearer ${token} extra`],
    ])('rejects a %s Authorization header', async (_, authorization) => {
      await expect(authenticate({ headers: { authorization } })).resolves.toBe(
        'fail',
      );
      expect(validateApiKey.execute).not.toHaveBeenCalled();
    });
  });
});
