import {
  buildLegacyCustomConfig,
  restoreLegacyCustomAuth,
} from './migration-utils/legacy-custom-mcp-integration-backfill';

describe('legacy custom MCP integration backfill', () => {
  it('converts no-auth integrations to an empty custom schema', () => {
    expect(
      buildLegacyCustomConfig({
        authType: 'NO_AUTH',
        authToken: null,
        secret: null,
        headerName: null,
      }),
    ).toEqual({
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [],
        userFields: [],
      },
      orgConfigValues: {},
    });
  });

  it('copies bearer ciphertext into an organization Authorization field', () => {
    expect(
      buildLegacyCustomConfig({
        authType: 'BEARER_TOKEN',
        authToken: 'iv:ciphertext:tag',
        secret: null,
        headerName: null,
      }),
    ).toEqual({
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'bearerToken',
            label: 'Bearer token',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
          },
        ],
        userFields: [],
      },
      orgConfigValues: { bearerToken: 'iv:ciphertext:tag' },
    });
  });

  it('copies custom-header ciphertext and its stored header name', () => {
    expect(
      buildLegacyCustomConfig({
        authType: 'CUSTOM_HEADER',
        authToken: null,
        secret: 'iv:header-ciphertext:tag',
        headerName: 'X-Municipality-Key',
      }),
    ).toEqual({
      configSchema: {
        authType: 'CUSTOM',
        orgFields: [
          {
            key: 'headerCredential',
            label: 'Header credential',
            type: 'secret',
            headerName: 'X-Municipality-Key',
            required: true,
          },
        ],
        userFields: [],
      },
      orgConfigValues: {
        headerCredential: 'iv:header-ciphertext:tag',
      },
    });
  });

  it.each([
    {
      authType: 'OAUTH',
      authToken: null,
      secret: null,
      headerName: null,
    },
    {
      authType: 'BEARER_TOKEN',
      authToken: null,
      secret: null,
      headerName: null,
    },
    {
      authType: 'CUSTOM_HEADER',
      authToken: null,
      secret: 'encrypted-secret',
      headerName: '',
    },
  ])('rejects unsupported or malformed legacy auth %#', (legacyAuth) => {
    expect(() => buildLegacyCustomConfig(legacyAuth)).toThrow(
      'Cannot backfill legacy custom MCP authentication',
    );
  });

  it('restores each migrated schema to its legacy auth representation', () => {
    const legacyRows = [
      {
        authType: 'NO_AUTH',
        authToken: null,
        secret: null,
        headerName: null,
      },
      {
        authType: 'BEARER_TOKEN',
        authToken: 'encrypted-bearer-token',
        secret: null,
        headerName: null,
      },
      {
        authType: 'CUSTOM_HEADER',
        authToken: null,
        secret: 'encrypted-header-secret',
        headerName: 'X-API-Key',
      },
    ];

    for (const legacyRow of legacyRows) {
      const migrated = buildLegacyCustomConfig(legacyRow);
      expect(
        restoreLegacyCustomAuth(
          migrated.configSchema,
          migrated.orgConfigValues,
        ),
      ).toEqual(legacyRow);
    }
  });

  it('rejects rollback of custom schemas that have no legacy representation', () => {
    expect(() =>
      restoreLegacyCustomAuth(
        {
          authType: 'CUSTOM',
          orgFields: [],
          userFields: [
            {
              key: 'personalToken',
              label: 'Personal token',
              type: 'secret',
              headerName: 'Authorization',
              required: true,
            },
          ],
        },
        {},
      ),
    ).toThrow('Cannot restore schema-configured custom MCP integration');
  });

  it('rejects rollback when configuration values would be discarded', () => {
    expect(() =>
      restoreLegacyCustomAuth(
        {
          authType: 'CUSTOM',
          orgFields: [],
          userFields: [],
        },
        { unexpected: 'value' },
      ),
    ).toThrow('Cannot restore schema-configured custom MCP integration');
  });
});
