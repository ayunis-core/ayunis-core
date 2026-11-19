import { randomUUID } from 'crypto';
import type { EntraAppToken } from 'src/domain/connectors/application/ports/entra-app-token.port';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { Microsoft365AppTokenService } from './microsoft-365-app-token.service';
import { Microsoft365GraphTokensService } from './microsoft-365-graph-tokens.service';
import { GraphRequestRejectedError } from './sharepoint/sharepoint-graph.helpers';

describe('Microsoft365GraphTokensService', () => {
  function setUp() {
    let issued = 0;
    const appTokens = {
      requestToken: (): Promise<EntraAppToken> =>
        Promise.resolve({
          status: 'issued',
          accessToken: `token-${++issued}`,
          roles: ['Sites.Selected'],
          expiresAt: new Date(Date.now() + 3_600_000),
        }),
    } as unknown as Microsoft365AppTokenService;
    const connector = new Connector({
      orgId: randomUUID(),
      product: ConnectorProduct.MICROSOFT_365,
      setup: { tenantId: randomUUID(), clientId: randomUUID() },
      encryptedCredentials: 'encrypted',
    });
    return { tokens: new Microsoft365GraphTokensService(appTokens), connector };
  }

  it('asks for a new token once Graph refused the one it holds, instead of serving it until it expires', async () => {
    const { tokens, connector } = setUp();
    const refused = tokens.withAccessToken(connector, () =>
      Promise.reject(
        new GraphRequestRejectedError(401, 'InvalidAuthenticationToken'),
      ),
    );
    await expect(refused).rejects.toThrow('401');

    expect(
      await tokens.withAccessToken(connector, (token) =>
        Promise.resolve(token),
      ),
    ).toBe('token-2');
  });

  it('asks for a new token when the credentials changed', async () => {
    const { tokens, connector } = setUp();
    await tokens.withAccessToken(connector, (token) => Promise.resolve(token));

    connector.encryptedCredentials = 'encrypted-new-secret';

    expect(
      await tokens.withAccessToken(connector, (token) =>
        Promise.resolve(token),
      ),
    ).toBe('token-2');
  });
});
