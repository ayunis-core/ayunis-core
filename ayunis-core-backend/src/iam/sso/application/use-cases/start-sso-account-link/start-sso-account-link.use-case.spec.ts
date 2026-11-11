import { ConfigService } from '@nestjs/config';
import { SsoAccountLinkPolicyService } from 'src/iam/sso/application/services/sso-account-link-policy.service';
import { aUser } from 'src/iam/users/application/testing/user.fixtures';
import type { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import type { UUID } from 'crypto';
import { createHash } from 'crypto';
import { StartSsoAccountLinkCommand } from 'src/iam/sso/application/use-cases/start-sso-account-link/start-sso-account-link.command';
import { StartSsoAccountLinkUseCase } from 'src/iam/sso/application/use-cases/start-sso-account-link/start-sso-account-link.use-case';
import { SsoAuthorizationTransactionService } from 'src/iam/sso/application/services/sso-authorization-transaction.service';
import { createMockOrgSsoConnectionsRepository } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import {
  anEnabledSsoConnection,
  SSO_TEST_ORG_ID,
} from 'src/iam/sso/application/testing/sso-login.fixtures';
import { SsoLoginPurpose } from 'src/iam/sso/domain/sso-login-purpose.enum';

const USER_ID = 'd19130fa-f2e6-4c92-84a9-62a651269104' as UUID;

describe(StartSsoAccountLinkUseCase.name, () => {
  it('binds the OIDC transaction to the authenticated Core user', async () => {
    const connections = createMockOrgSsoConnectionsRepository();
    connections.findByOrgId.mockResolvedValue(anEnabledSsoConnection());
    const transactions = {
      save: jest.fn().mockImplementation(async (transaction) => transaction),
      consume: jest.fn(),
      deleteExpired: jest.fn(),
    };
    const broker = {
      createAuthorizationRequest: jest.fn().mockResolvedValue({
        authorizationUrl: 'https://sso.ayunis.de/oauth/v2/authorize',
        state: 'link-state',
        nonce: 'link-nonce',
        codeVerifier: 'link-verifier',
      }),
      validateCallback: jest.fn(),
    };
    const useCase = new StartSsoAccountLinkUseCase(
      new SsoAccountLinkPolicyService(
        connections,
        {
          existsByUserIdAndIssuer: jest.fn().mockResolvedValue(false),
          findSubjectsByUserId: jest.fn().mockResolvedValue([]),
          findSubjectsByOrgId: jest.fn().mockResolvedValue([]),
          findLinkedSubjects: jest.fn().mockResolvedValue([]),
          findByIssuerAndSubject: jest.fn(),
          create: jest.fn(),
        },
        {
          execute: jest.fn().mockResolvedValue(
            aUser({
              id: USER_ID,
              orgId: SSO_TEST_ORG_ID,
              email: 'staff@demo.com',
            }),
          ),
        } as unknown as FindUserByIdUseCase,
        new ConfigService({ ssoOidc: { issuer: 'https://broker.example' } }),
      ),
      new SsoAuthorizationTransactionService(transactions, broker, {
        encrypt: jest.fn((value: string) => `encrypted:${value}`),
        decrypt: jest.fn(),
      }),
    );

    const result = await useCase.execute(
      new StartSsoAccountLinkCommand(USER_ID, SSO_TEST_ORG_ID),
    );

    expect(transactions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: SSO_TEST_ORG_ID,
        stateHash: createHash('sha256').update('link-state').digest('hex'),
        browserBindingHash: createHash('sha256')
          .update(result.browserBinding)
          .digest('hex'),
        purpose: SsoLoginPurpose.LINK,
        linkUserId: USER_ID,
        postLoginPath: '/settings/account?ssoLinked=true',
      }),
    );
  });

  it('refuses linking when SSO is disabled', async () => {
    const connections = createMockOrgSsoConnectionsRepository();
    connections.findByOrgId.mockResolvedValue(
      anEnabledSsoConnection({ enabled: false }),
    );
    const useCase = new StartSsoAccountLinkUseCase(
      new SsoAccountLinkPolicyService(
        connections,
        {
          existsByUserIdAndIssuer: jest.fn().mockResolvedValue(false),
          findSubjectsByUserId: jest.fn().mockResolvedValue([]),
          findSubjectsByOrgId: jest.fn().mockResolvedValue([]),
          findLinkedSubjects: jest.fn().mockResolvedValue([]),
          findByIssuerAndSubject: jest.fn(),
          create: jest.fn(),
        },
        {
          execute: jest.fn().mockResolvedValue(
            aUser({
              id: USER_ID,
              orgId: SSO_TEST_ORG_ID,
              email: 'staff@demo.com',
            }),
          ),
        } as unknown as FindUserByIdUseCase,
        new ConfigService({ ssoOidc: { issuer: 'https://broker.example' } }),
      ),
      new SsoAuthorizationTransactionService(
        { save: jest.fn(), consume: jest.fn(), deleteExpired: jest.fn() },
        { createAuthorizationRequest: jest.fn(), validateCallback: jest.fn() },
        { encrypt: jest.fn(), decrypt: jest.fn() },
      ),
    );

    await expect(
      useCase.execute(new StartSsoAccountLinkCommand(USER_ID, SSO_TEST_ORG_ID)),
    ).rejects.toMatchObject({ code: 'SSO_CONNECTION_NOT_AVAILABLE' });
  });
});
