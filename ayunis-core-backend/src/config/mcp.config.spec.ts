import { mcpConfig } from './mcp.config';

describe('mcpConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('exposes the public backend and frontend URLs used by MCP OAuth', () => {
    process.env.BACKEND_BASEURL = 'https://api.ayunis.example';
    process.env.FRONTEND_BASEURL = 'https://app.ayunis.example';

    expect(mcpConfig()).toEqual(
      expect.objectContaining({
        backendBaseUrl: 'https://api.ayunis.example',
        frontendBaseUrl: 'https://app.ayunis.example',
      }),
    );
  });

  it('uses localhost defaults for local OAuth development', () => {
    delete process.env.BACKEND_BASEURL;
    delete process.env.FRONTEND_BASEURL;

    expect(mcpConfig()).toEqual(
      expect.objectContaining({
        backendBaseUrl: 'http://localhost:3000',
        frontendBaseUrl: 'http://localhost:3001',
      }),
    );
  });
});
