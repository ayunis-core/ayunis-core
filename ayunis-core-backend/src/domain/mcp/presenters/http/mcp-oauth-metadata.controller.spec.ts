import type { ConfigService } from '@nestjs/config';
import { McpOAuthMetadataController } from './mcp-oauth-metadata.controller';

describe('McpOAuthMetadataController', () => {
  it('publishes a CIMD document whose client ID exactly matches its URL', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'mcp.backendBaseUrl') return 'https://api.ayunis.example/';
        if (key === 'mcp.frontendBaseUrl') return 'https://app.ayunis.example/';
        throw new Error(`Unexpected key ${key}`);
      }),
    } as unknown as ConfigService;
    const controller = new McpOAuthMetadataController(configService);

    expect(controller.getClientMetadata()).toEqual({
      client_id:
        'https://api.ayunis.example/api/mcp-integrations/oauth/client-metadata.json',
      client_name: 'Ayunis Core',
      client_uri: 'https://app.ayunis.example/',
      redirect_uris: [
        'https://app.ayunis.example/settings/integrations/oauth/callback',
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
    });
  });
});
