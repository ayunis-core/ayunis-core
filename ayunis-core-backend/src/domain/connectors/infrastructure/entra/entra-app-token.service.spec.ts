import type { ConfigService } from '@nestjs/config';
import {
  ProviderConnectionError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import {
  EntraResource,
  EntraTokenRejection,
} from 'src/domain/connectors/application/ports/entra-app-token.port';
import { EntraAppTokenService } from './entra-app-token.service';

const CREDENTIALS = {
  tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
  clientId: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
  clientSecret: 'Zq8~kR2.client-secret+value&more',
};
const LOGIN_ORIGIN = 'https://login.microsoftonline.com';

function accessToken(payload: object): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'RS256', typ: 'JWT' })}.${part(payload)}.c2lnbmF0dXJl`;
}

/** Shapes of the error bodies Entra answered the test tenant with. */
function entraError(status: number, error: string, code: number): Response {
  return Response.json(
    {
      error,
      error_description: `AADSTS${code}: Trace ID: 98297dd5 Correlation ID: 1f53f0a2`,
      error_codes: [code],
      trace_id: '98297dd5-c909-4cdc-9885-9a827dfde301',
    },
    { status },
  );
}

describe('EntraAppTokenService', () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  const service = new EntraAppTokenService({
    get: () => LOGIN_ORIGIN,
  } as unknown as ConfigService);

  afterEach(() => fetchMock.mockReset());

  it('requests a client credentials token for the resource from the tenant', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        token_type: 'Bearer',
        expires_in: 3599,
        access_token: accessToken({ roles: ['Sites.Selected'] }),
      }),
    );

    await service.requestToken(CREDENTIALS, EntraResource.SHAREPOINT);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `${LOGIN_ORIGIN}/${CREDENTIALS.tenantId}/oauth2/v2.0/token`,
    );
    expect(init?.method).toBe('POST');
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      grant_type: 'client_credentials',
      client_id: CREDENTIALS.clientId,
      client_secret: CREDENTIALS.clientSecret,
      scope: '00000003-0000-0ff1-ce00-000000000000/.default',
    });
  });

  it("reads the granted permissions from the token's roles claim", async () => {
    const token = accessToken({
      aud: 'https://graph.microsoft.com',
      roles: ['Sites.Selected', 'Files.SelectedOperations.Selected'],
    });
    fetchMock.mockResolvedValue(
      Response.json({
        token_type: 'Bearer',
        expires_in: 3599,
        access_token: token,
      }),
    );

    const result = await service.requestToken(
      CREDENTIALS,
      EntraResource.MICROSOFT_GRAPH,
    );

    expect(
      (fetchMock.mock.calls[0][1]?.body as URLSearchParams).get('scope'),
    ).toBe('https://graph.microsoft.com/.default');
    expect(result).toMatchObject({
      status: 'issued',
      accessToken: token,
      roles: ['Sites.Selected', 'Files.SelectedOperations.Selected'],
    });
  });

  it('reads a token without a roles claim as no permissions', async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        token_type: 'Bearer',
        expires_in: 3599,
        access_token: accessToken({ aud: 'https://graph.microsoft.com' }),
      }),
    );

    await expect(
      service.requestToken(CREDENTIALS, EntraResource.MICROSOFT_GRAPH),
    ).resolves.toMatchObject({ status: 'issued', roles: [] });
  });

  it.each([
    [400, 'invalid_request', 90002, EntraTokenRejection.TENANT_NOT_FOUND],
    [400, 'unauthorized_client', 700016, EntraTokenRejection.CLIENT_NOT_FOUND],
    [401, 'invalid_client', 7000215, EntraTokenRejection.CLIENT_SECRET_INVALID],
    [401, 'invalid_client', 7000222, EntraTokenRejection.CLIENT_SECRET_EXPIRED],
    [400, 'invalid_grant', 53003, EntraTokenRejection.OTHER],
  ])(
    'classifies Entra answering %i %s (AADSTS%i)',
    async (status, error, code, reason) => {
      fetchMock.mockResolvedValue(entraError(status, error, code));

      await expect(
        service.requestToken(CREDENTIALS, EntraResource.MICROSOFT_GRAPH),
      ).resolves.toEqual({
        status: 'rejected',
        reason,
        errorCode: `AADSTS${code}`,
      });
    },
  );

  it('treats a refusal without an Entra error body as another rejection', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Request', { status: 400 }));

    await expect(
      service.requestToken(CREDENTIALS, EntraResource.MICROSOFT_GRAPH),
    ).resolves.toEqual({
      status: 'rejected',
      reason: EntraTokenRejection.OTHER,
      errorCode: null,
    });
  });

  it.each([
    [503, ProviderServerError],
    [504, ProviderTimeoutError],
  ])(
    'throws a provider failure when Entra answers %i',
    async (status, errorClass) => {
      fetchMock.mockResolvedValue(
        new Response('<html>unavailable</html>', { status }),
      );

      await expect(
        service.requestToken(CREDENTIALS, EntraResource.MICROSOFT_GRAPH),
      ).rejects.toThrow(errorClass);
    },
  );

  it('throws a provider failure when Entra cannot be reached', async () => {
    fetchMock.mockRejectedValue(
      new TypeError('fetch failed', {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND'), {
          code: 'ENOTFOUND',
        }),
      }),
    );

    await expect(
      service.requestToken(CREDENTIALS, EntraResource.MICROSOFT_GRAPH),
    ).rejects.toThrow(ProviderConnectionError);
  });
});
