import { ProviderConnectionError } from 'src/common/errors/provider.errors';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import { TEST_ORG_ID } from 'src/common/context/testing/context.fixtures';
import type { ConnectorCredentialEncryptionPort } from 'src/domain/connectors/application/ports/connector-credential-encryption.port';
import {
  type EntraAppCredentials,
  type EntraAppToken,
  type EntraAppTokenPort,
  EntraResource,
  EntraTokenRejection,
} from 'src/domain/connectors/application/ports/entra-app-token.port';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { Microsoft365ConnectionTestOutcome as Outcome } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection-test-outcome.enum';
import { Microsoft365AppTokenService } from './microsoft-365-app-token.service';
import { Microsoft365ConnectionTestService } from './microsoft-365-connection-test.service';

jest.mock('src/common/errors/report-unexpected-error.helper', () => ({
  reportUnexpectedError: jest.fn(),
}));

const SETUP = {
  tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
  clientId: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
};
const SECRET = 'Zq8~kR2.client-secret-value';

const issued = (roles: string[]): EntraAppToken => ({
  status: 'issued',
  accessToken: 'eyJ.token.sig',
  roles,
  expiresAt: new Date(Date.now() + 3_600_000),
});
const rejected = (
  reason: EntraTokenRejection,
  errorCode: string,
): EntraAppToken => ({ status: 'rejected', reason, errorCode });

function testWith(
  tokens: Partial<Record<EntraResource, EntraAppToken | Error>>,
) {
  const requests: [EntraAppCredentials, EntraResource][] = [];
  const entra: EntraAppTokenPort = {
    requestToken: (credentials, resource) => {
      requests.push([credentials, resource]);
      const token = tokens[resource] ?? issued([]);
      return token instanceof Error
        ? Promise.reject(token)
        : Promise.resolve(token);
    },
  };
  const encryption: ConnectorCredentialEncryptionPort = {
    encrypt: jest.fn(),
    decrypt: (ciphertext) =>
      Promise.resolve(Buffer.from(ciphertext, 'base64').toString()),
  };
  const connector = new Connector({
    orgId: TEST_ORG_ID,
    product: ConnectorProduct.MICROSOFT_365,
    setup: SETUP,
    encryptedCredentials: Buffer.from(
      JSON.stringify({ clientSecret: SECRET }),
    ).toString('base64'),
  });
  const service = new Microsoft365ConnectionTestService(
    new Microsoft365AppTokenService(encryption, entra),
  );
  return { result: service.test(connector), requests };
}

const permissions = (granted: string[]) =>
  [
    { name: 'Sites.Selected', required: true },
    { name: 'Files.SelectedOperations.Selected', required: false },
    { name: 'Lists.SelectedOperations.Selected', required: false },
  ].map((permission) => ({
    ...permission,
    granted: granted.includes(permission.name),
  }));

describe('Microsoft365ConnectionTestService', () => {
  it("requests a Microsoft Graph token with the connector's stored credentials", async () => {
    const { result, requests } = testWith({
      [EntraResource.MICROSOFT_GRAPH]: issued(['Sites.Selected']),
    });
    await result;

    expect(requests).toEqual([
      [{ ...SETUP, clientSecret: SECRET }, EntraResource.MICROSOFT_GRAPH],
    ]);
  });

  it('is connected with Sites.Selected and shows which permissions are granted', async () => {
    const { result } = testWith({
      [EntraResource.MICROSOFT_GRAPH]: issued([
        'Sites.Selected',
        'Files.SelectedOperations.Selected',
        'User.Read.All',
      ]),
    });

    await expect(result).resolves.toEqual({
      outcome: Outcome.CONNECTED,
      permissions: permissions([
        'Sites.Selected',
        'Files.SelectedOperations.Selected',
      ]),
      otherGrantedPermissions: ['User.Read.All'],
      entraErrorCode: null,
    });
  });

  it('reports the required permission missing when the Graph roles lack Sites.Selected', async () => {
    const { result } = testWith({
      [EntraResource.MICROSOFT_GRAPH]: issued([
        'Files.SelectedOperations.Selected',
      ]),
    });

    await expect(result).resolves.toMatchObject({
      outcome: Outcome.REQUIRED_PERMISSION_MISSING,
      permissions: permissions(['Files.SelectedOperations.Selected']),
    });
  });

  it('reports consent on the wrong API when only the SharePoint token carries roles', async () => {
    const { result } = testWith({
      [EntraResource.MICROSOFT_GRAPH]: issued([]),
      [EntraResource.SHAREPOINT]: issued(['Sites.Selected']),
    });

    await expect(result).resolves.toEqual({
      outcome: Outcome.CONSENT_ON_WRONG_API,
      permissions: permissions([]),
      otherGrantedPermissions: [],
      entraErrorCode: null,
    });
  });

  it.each([
    ['carries no roles either', issued([])],
    ['is refused', rejected(EntraTokenRejection.OTHER, 'AADSTS500011')],
  ])(
    'reports missing consent when the Graph token has no roles and the SharePoint token %s',
    async (_, sharePoint) => {
      const { result } = testWith({
        [EntraResource.MICROSOFT_GRAPH]: issued([]),
        [EntraResource.SHAREPOINT]: sharePoint,
      });

      await expect(result).resolves.toMatchObject({
        outcome: Outcome.CONSENT_MISSING,
        entraErrorCode: null,
      });
    },
  );

  it.each([
    [
      EntraTokenRejection.TENANT_NOT_FOUND,
      'AADSTS90002',
      Outcome.TENANT_NOT_FOUND,
    ],
    [
      EntraTokenRejection.CLIENT_NOT_FOUND,
      'AADSTS700016',
      Outcome.CLIENT_NOT_FOUND,
    ],
    [
      EntraTokenRejection.CLIENT_SECRET_INVALID,
      'AADSTS7000215',
      Outcome.CLIENT_SECRET_INVALID,
    ],
    [
      EntraTokenRejection.CLIENT_SECRET_EXPIRED,
      'AADSTS7000222',
      Outcome.CLIENT_SECRET_EXPIRED,
    ],
    [EntraTokenRejection.OTHER, 'AADSTS53003', Outcome.REJECTED],
  ])(
    'reports Entra refusing the token (%s) with its error code',
    async (reason, errorCode, outcome) => {
      const { result, requests } = testWith({
        [EntraResource.MICROSOFT_GRAPH]: rejected(reason, errorCode),
      });

      await expect(result).resolves.toEqual({
        outcome,
        permissions: permissions([]),
        otherGrantedPermissions: [],
        entraErrorCode: errorCode,
      });
      expect(requests).toHaveLength(1);
    },
  );

  it('reports Microsoft as unavailable instead of failing when Entra cannot be reached, and still reports the outage', async () => {
    const outage = new ProviderConnectionError({ provider: 'microsoft_entra' });
    const { result } = testWith({ [EntraResource.MICROSOFT_GRAPH]: outage });

    await expect(result).resolves.toMatchObject({
      outcome: Outcome.MICROSOFT_UNAVAILABLE,
    });
    expect(reportUnexpectedError).toHaveBeenCalledWith(outage);
  });

  it('does not hide unexpected failures as an outcome', async () => {
    const { result } = testWith({
      [EntraResource.MICROSOFT_GRAPH]: new TypeError('broken'),
    });

    await expect(result).rejects.toThrow(TypeError);
  });
});
