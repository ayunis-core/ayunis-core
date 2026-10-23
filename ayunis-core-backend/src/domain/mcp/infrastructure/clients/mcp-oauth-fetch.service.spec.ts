import { McpOAuthFetchService } from './mcp-oauth-fetch.service';
import { isIP } from 'node:net';
import { fetch, Response } from 'undici';
import type * as Undici from 'undici';

jest.mock('undici', () => ({
  ...jest.requireActual<typeof Undici>('undici'),
  fetch: jest.fn(),
}));

const fetchMock = jest.mocked(fetch);
const realFetch = jest.requireActual<typeof Undici>('undici').fetch;

/* eslint-disable sonarjs/no-hardcoded-ip -- These literals exercise SSRF address filtering. */

class StubMcpOAuthFetchService extends McpOAuthFetchService {
  constructor(
    config: ConstructorParameters<typeof McpOAuthFetchService>[0],
    private readonly addresses: string[],
  ) {
    super(config);
  }

  protected override async resolveAddresses(
    hostname: string,
  ): Promise<string[]> {
    return isIP(hostname) ? [hostname] : this.addresses;
  }
}

class RebindingMcpOAuthFetchService extends McpOAuthFetchService {
  private resolution = 0;

  protected override async resolveAddresses(): Promise<string[]> {
    this.resolution += 1;
    return this.resolution === 1 ? ['1.1.1.1'] : ['127.0.0.1'];
  }
}

describe('McpOAuthFetchService', () => {
  beforeEach(() => {
    fetchMock
      .mockReset()
      .mockResolvedValue(new Response('ok', { status: 200 }));
  });

  it('rejects non-HTTPS OAuth URLs in production', async () => {
    const service = buildService(false);

    await expect(
      service.fetch('http://auth.example.com/token'),
    ).rejects.toThrow('OAuth endpoints must use HTTPS');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects private and reserved IP addresses before requesting them', async () => {
    const service = buildService(false);

    await expect(
      service.fetch('https://169.254.169.254/latest/meta-data'),
    ).rejects.toThrow(
      'OAuth endpoint resolves to a private or reserved address',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects hostnames that resolve to private addresses', async () => {
    const service = buildService(false, ['10.24.0.5']);

    await expect(
      service.fetch('https://auth.example.com/token'),
    ).rejects.toThrow(
      'OAuth endpoint resolves to a private or reserved address',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks IPv4-mapped IPv6 addresses for private IPv4 ranges', async () => {
    const service = buildService(false, ['::ffff:127.0.0.1']);

    await expect(
      service.fetch('https://auth.example.com/token'),
    ).rejects.toThrow(
      'OAuth endpoint resolves to a private or reserved address',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows IPv4-mapped IPv6 addresses for public IPv4 ranges', async () => {
    const service = buildService(false, ['::ffff:8.8.8.8']);

    await expect(
      service.fetch('https://auth.example.com/token'),
    ).resolves.toEqual(expect.objectContaining({ status: 200 }));
  });

  it('returns a global Response so the MCP SDK can parse OAuth errors', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"invalid_grant"}', {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const service = buildService(false, ['1.1.1.1']);

    const response = await service.fetch('https://auth.example.com/token');

    expect(response).toBeInstanceOf(globalThis.Response);
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/json');
    await expect(response.text()).resolves.toBe('{"error":"invalid_grant"}');
  });

  it('pins validated DNS lookups for the outbound connection', async () => {
    const service = buildService(false, ['1.1.1.1']);

    await service.fetch('https://auth.example.com/token');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ dispatcher: expect.anything() }),
    );
  });

  it('blocks DNS rebinding between validation and connection', async () => {
    fetchMock.mockImplementation(realFetch);
    const config = { get: jest.fn().mockReturnValue(false) };
    const service = new RebindingMcpOAuthFetchService(config as never);

    await expect(
      service.fetch('https://auth.example.com/token'),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: 'OAuth endpoint resolves to a private or reserved address',
      }),
    });
    await service.onModuleDestroy();
  });

  it('revalidates redirect destinations before following them', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://127.0.0.1/admin' },
      }),
    );
    const service = buildService(false, ['1.1.1.1']);

    await expect(
      service.fetch('https://auth.example.com/.well-known/oauth'),
    ).rejects.toThrow(
      'OAuth endpoint resolves to a private or reserved address',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects redirects to a different origin', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://other.example.com/token' },
      }),
    );
    const service = buildService(false, ['1.1.1.1']);

    await expect(
      service.fetch('https://auth.example.com/token'),
    ).rejects.toThrow('Cross-origin OAuth redirects are not allowed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows HTTP loopback endpoints only during development', async () => {
    const service = buildService(true);

    await expect(service.fetch('http://localhost:8080/token')).resolves.toEqual(
      expect.objectContaining({ status: 200 }),
    );
  });

  function buildService(
    development: boolean,
    resolvedAddresses?: string[],
  ): McpOAuthFetchService {
    const config = {
      get: jest.fn().mockReturnValue(development),
    };
    return resolvedAddresses
      ? new StubMcpOAuthFetchService(config as never, resolvedAddresses)
      : new McpOAuthFetchService(config as never);
  }
});
/* eslint-enable sonarjs/no-hardcoded-ip */
