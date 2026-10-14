import { Logger } from '@nestjs/common';
import {
  OAuthError,
  RegistrationRejectedError,
} from '@modelcontextprotocol/client';
import { createHash, randomUUID } from 'crypto';
import { McpOAuthAuthorizationService } from './mcp-oauth-authorization.service';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import { McpOAuthPendingSession } from 'src/domain/mcp/domain/mcp-oauth-pending-session.entity';
import {
  McpErrorCode,
  McpOAuthInvalidResponseError,
} from 'src/domain/mcp/application/mcp.errors';

const SERVER = 'https://mcp.example.com';
const ISSUER = 'https://auth.example.com';
const RESOURCE_METADATA = `${SERVER}/.well-known/oauth-protected-resource/mcp`;
const AS_METADATA = `${ISSUER}/.well-known/oauth-authorization-server`;
const REGISTRATION = `${ISSUER}/register`;
const TOKEN = `${ISSUER}/token`;
const SECRET = 'client-secret-value';

const asMetadata = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/authorize`,
  token_endpoint: TOKEN,
  registration_endpoint: REGISTRATION,
  response_types_supported: ['code'],
  code_challenge_methods_supported: ['S256'],
};

const validResponses: Record<string, () => Response> = {
  [RESOURCE_METADATA]: () =>
    Response.json({
      resource: `${SERVER}/mcp`,
      authorization_servers: [ISSUER],
    }),
  [AS_METADATA]: () => Response.json(asMetadata),
  [REGISTRATION]: () =>
    Response.json({
      client_id: 'client-id',
      client_secret: SECRET,
      redirect_uris: ['https://app.example.com/oauth/callback'],
    }),
  [TOKEN]: () => Response.json({ access_token: 'at', token_type: 'Bearer' }),
};

const htmlPage = (status = 200) =>
  new Response('<!DOCTYPE html><html><body>Sign in</body></html>', {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

describe('McpOAuthAuthorizationService with non-JSON upstream responses', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const integration = new MarketplaceMcpIntegration({
    orgId,
    name: 'OAuth server',
    serverUrl: `${SERVER}/mcp`,
    auth: new NoAuthMcpIntegrationAuth(),
    marketplaceIdentifier: 'oauth-server',
    configSchema: {
      authType: 'OAUTH',
      orgFields: [],
      userFields: [],
      oauth: { clientRegistration: 'automatic' },
    },
    orgConfigValues: {},
  });
  const pendingSessions = { consumeByStateHash: jest.fn() };
  const cache = { invalidate: jest.fn() };
  const mcpClient = { invalidateConnections: jest.fn() };
  let overrides: Record<string, () => Response>;
  let oauthFetch: { fetch: jest.Mock };
  let warn: jest.SpyInstance;
  let service: McpOAuthAuthorizationService;
  let authorizationUrl: URL | undefined;
  let clientInformation: Record<string, unknown> | undefined;
  let discoveryState: Record<string, unknown> | undefined;

  const provider = {
    redirectUrl: 'https://app.example.com/oauth/callback',
    clientMetadata: {
      redirect_uris: ['https://app.example.com/oauth/callback'],
      client_name: 'Ayunis',
    },
    state: () => Promise.resolve('opaque-state'),
    clientInformation: () => Promise.resolve(clientInformation),
    saveClientInformation: (info: Record<string, unknown>) => {
      clientInformation = info;
      return Promise.resolve();
    },
    discoveryState: () => Promise.resolve(discoveryState),
    saveDiscoveryState: (state: Record<string, unknown>) => {
      discoveryState = state;
      return Promise.resolve();
    },
    tokens: () => Promise.resolve(undefined),
    saveTokens: jest.fn(),
    codeVerifier: () => Promise.resolve('verifier'),
    saveCodeVerifier: () => Promise.resolve(),
    redirectToAuthorization: (url: URL) => {
      authorizationUrl = url;
      return Promise.resolve();
    },
    getAuthorizationUrl: () => authorizationUrl,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    overrides = {};
    authorizationUrl = undefined;
    clientInformation = undefined;
    discoveryState = undefined;
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    oauthFetch = {
      fetch: jest.fn((input: URL | string) => {
        const url = String(input);
        const respond = overrides[url] ?? validResponses[url];
        return Promise.resolve(
          respond ? respond() : new Response(null, { status: 404 }),
        );
      }),
    };
    service = new McpOAuthAuthorizationService(
      { validate: jest.fn().mockResolvedValue(integration) } as never,
      {
        get: (key: string) => (key === 'userId' ? userId : orgId),
      } as never,
      { create: () => provider } as never,
      pendingSessions as never,
      {} as never,
      {} as never,
      {} as never,
      cache as never,
      oauthFetch,
      mcpClient as never,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  async function expectInvalidResponse(
    act: Promise<unknown>,
    stage: string,
    status = 200,
  ): Promise<void> {
    const error: unknown = await act.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(McpOAuthInvalidResponseError);
    const invalid = error as McpOAuthInvalidResponseError;
    expect(invalid.statusCode).toBe(502);
    expect(invalid.code).toBe(McpErrorCode.MCP_OAUTH_INVALID_RESPONSE);
    expect(invalid.message).toContain(`OAuth ${stage}`);
    expect(invalid.message).toContain(SERVER);
    expect(invalid.message).not.toContain(`${SERVER}/mcp`);
    expect(invalid.message).not.toContain('DOCTYPE');
    const diagnostics = {
      integrationId: integration.id,
      stage,
      status,
      contentType: 'text/html',
    };
    expect(invalid.metadata).toEqual(diagnostics);
    expect(invalid.cause).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(diagnostics, expect.any(String));
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(
      /DOCTYPE|client-secret-value|verifier|code-value/,
    );
  }

  it('starts authorization through the guarded fetch when every endpoint returns JSON', async () => {
    await expect(service.authorize(integration.id)).resolves.toEqual({
      authorizationUrl: expect.stringContaining(`${ISSUER}/authorize?`),
    });
    expect(oauthFetch.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: REGISTRATION }),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ['resource discovery', RESOURCE_METADATA],
    ['authorization-server discovery', AS_METADATA],
    ['client registration', REGISTRATION],
  ])('reports an HTML page during %s', async (stage, url) => {
    overrides[url] = htmlPage;

    await expectInvalidResponse(service.authorize(integration.id), stage);
  });

  it('reports malformed JSON with its stage', async () => {
    overrides[AS_METADATA] = () =>
      new Response('{"issuer": ', {
        headers: { 'content-type': 'text/html' },
      });

    await expectInvalidResponse(
      service.authorize(integration.id),
      'authorization-server discovery',
    );
  });

  function prepareCallback(): string {
    const state = 'opaque-state';
    clientInformation = { client_id: 'client-id', issuer: ISSUER };
    discoveryState = {
      authorizationServerUrl: ISSUER,
      authorizationServerMetadata: asMetadata,
    };
    pendingSessions.consumeByStateHash.mockResolvedValue(
      new McpOAuthPendingSession({
        stateHash: createHash('sha256').update(state).digest('hex'),
        encryptedCodeVerifier: 'encrypted-verifier',
        redirectUri: provider.redirectUrl,
        integrationId: integration.id,
        orgId,
        userId,
        issuer: ISSUER,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    );
    return state;
  }

  it.each([200, 400, 401, 500, 502])(
    'reports HTTP %s HTML during token exchange',
    async (status) => {
      const state = prepareCallback();
      overrides[TOKEN] = () => htmlPage(status);

      await expectInvalidResponse(
        service.complete({ state, code: 'code-value', iss: ISSUER }),
        'token exchange',
        status,
      );
      expect(cache.invalidate).not.toHaveBeenCalled();
    },
  );

  it.each([400, 401, 500, 502])(
    'reports HTTP %s HTML during client registration',
    async (status) => {
      overrides[REGISTRATION] = () => htmlPage(status);
      await expectInvalidResponse(
        service.authorize(integration.id),
        'client registration',
        status,
      );
    },
  );

  it.each([
    ['resource discovery', RESOURCE_METADATA],
    ['authorization-server discovery', AS_METADATA],
  ])('reports HTTP 500 HTML during %s', async (stage, url) => {
    overrides[url] = () => htmlPage(500);
    await expectInvalidResponse(service.authorize(integration.id), stage, 500);
  });

  it('preserves protected-resource discovery fallback from an HTML 404', async () => {
    overrides[RESOURCE_METADATA] = () => htmlPage(404);
    overrides[`${SERVER}/.well-known/oauth-protected-resource`] =
      validResponses[RESOURCE_METADATA];
    await expect(service.authorize(integration.id)).resolves.toEqual({
      authorizationUrl: expect.stringContaining(`${ISSUER}/authorize?`),
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('preserves authorization-server discovery fallback from an HTML 502', async () => {
    overrides[AS_METADATA] = () => htmlPage(502);
    overrides[`${ISSUER}/.well-known/openid-configuration`] = () =>
      Response.json({
        ...asMetadata,
        jwks_uri: `${ISSUER}/jwks`,
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
      });
    await expect(service.authorize(integration.id)).resolves.toEqual({
      authorizationUrl: expect.stringContaining(`${ISSUER}/authorize?`),
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('preserves a final metadata 404 as a missing-metadata error', async () => {
    overrides[RESOURCE_METADATA] = () => htmlPage(404);
    await expect(service.authorize(integration.id)).rejects.not.toBeInstanceOf(
      McpOAuthInvalidResponseError,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('preserves a valid OAuth JSON error during token exchange', async () => {
    const state = prepareCallback();
    overrides[TOKEN] = () =>
      Response.json({ error: 'access_denied' }, { status: 400 });
    await expect(
      service.complete({ state, code: 'code-value', iss: ISSUER }),
    ).rejects.toBeInstanceOf(OAuthError);
    expect(warn).not.toHaveBeenCalled();
    expect(provider.saveTokens).not.toHaveBeenCalled();
  });

  it('preserves a valid JSON registration rejection', async () => {
    overrides[REGISTRATION] = () =>
      Response.json({ error: 'invalid_client_metadata' }, { status: 400 });
    await expect(service.authorize(integration.id)).rejects.toBeInstanceOf(
      RegistrationRejectedError,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not misclassify a guarded-fetch rejection after an HTML fallback', async () => {
    const blocked = new Error('Cross-origin OAuth redirects are not allowed');
    overrides[AS_METADATA] = () => htmlPage(502);
    overrides[`${ISSUER}/.well-known/openid-configuration`] = () => {
      throw blocked;
    };
    await expect(service.authorize(integration.id)).rejects.toBe(blocked);
    expect(warn).not.toHaveBeenCalled();
  });

  it('propagates guarded-fetch rejections unchanged', async () => {
    const blocked = new Error(
      'OAuth requests to private addresses are blocked',
    );
    oauthFetch.fetch.mockRejectedValue(blocked);

    await expect(service.authorize(integration.id)).rejects.toBe(blocked);
    expect(warn).not.toHaveBeenCalled();
  });
});
