import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decodeJwt } from 'jose';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  type EntraAppCredentials,
  type EntraAppToken,
  EntraAppTokenPort,
  EntraResource,
  EntraTokenRejection,
} from 'src/domain/connectors/application/ports/entra-app-token.port';

const PROVIDER = { provider: 'microsoft_entra' };
const REQUEST_TIMEOUT_MS = 15_000;

const SCOPES: Record<EntraResource, string> = {
  [EntraResource.MICROSOFT_GRAPH]: 'https://graph.microsoft.com/.default',
  // SharePoint Online's app ID, so no SharePoint host name is needed.
  [EntraResource.SHAREPOINT]: '00000003-0000-0ff1-ce00-000000000000/.default',
};

/** Entra error codes (AADSTS…) that point to a specific setup mistake. */
const REJECTION_BY_CODE: Record<number, EntraTokenRejection | undefined> = {
  90002: EntraTokenRejection.TENANT_NOT_FOUND,
  900023: EntraTokenRejection.TENANT_NOT_FOUND,
  700016: EntraTokenRejection.CLIENT_NOT_FOUND,
  7000215: EntraTokenRejection.CLIENT_SECRET_INVALID,
  7000222: EntraTokenRejection.CLIENT_SECRET_EXPIRED,
};

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  error_codes?: unknown;
}

/** Microsoft Entra's v2.0 token endpoint, client credentials flow. */
@Injectable()
export class EntraAppTokenService extends EntraAppTokenPort {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  /** Microsoft's login endpoint, or the stand-in of the e2e tests. */
  private get loginOrigin(): string {
    return this.configService.get<string>(
      'connectors.microsoftLoginOrigin',
    ) as string;
  }

  async requestToken(
    credentials: EntraAppCredentials,
    resource: EntraResource,
  ): Promise<EntraAppToken> {
    const response = await this.post(credentials, resource);
    if (response.ok) {
      return issuedToken((await response.json()) as TokenResponse);
    }
    const unavailable = wrapProviderFailure(
      { status: response.status },
      PROVIDER,
    );
    if (unavailable) throw unavailable;
    return rejectedToken(await readErrorBody(response));
  }

  private async post(
    { tenantId, clientId, clientSecret }: EntraAppCredentials,
    resource: EntraResource,
  ): Promise<Response> {
    try {
      return await fetch(
        `${this.loginOrigin}/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: SCOPES[resource],
          }),
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
    } catch (error) {
      throw wrapProviderFailure(error, PROVIDER) ?? error;
    }
  }
}

function issuedToken(body: TokenResponse): EntraAppToken {
  if (typeof body.access_token !== 'string') {
    throw new Error('Entra issued no access token');
  }
  const { roles } = decodeJwt(body.access_token);
  const expiresInSeconds = Number(body.expires_in);
  return {
    status: 'issued',
    accessToken: body.access_token,
    roles: Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === 'string')
      : [],
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  };
}

function rejectedToken(body: TokenResponse | null): EntraAppToken {
  const code = Array.isArray(body?.error_codes)
    ? (body.error_codes as unknown[]).find(
        (value): value is number => typeof value === 'number',
      )
    : undefined;
  if (code === undefined) {
    return {
      status: 'rejected',
      reason: EntraTokenRejection.OTHER,
      errorCode: null,
    };
  }
  return {
    status: 'rejected',
    reason: REJECTION_BY_CODE[code] ?? EntraTokenRejection.OTHER,
    errorCode: `AADSTS${code}`,
  };
}

async function readErrorBody(
  response: Response,
): Promise<TokenResponse | null> {
  try {
    return (await response.json()) as TokenResponse;
  } catch {
    return null;
  }
}
