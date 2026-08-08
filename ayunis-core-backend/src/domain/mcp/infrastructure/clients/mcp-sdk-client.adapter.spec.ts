import { Logger } from '@nestjs/common';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { McpSdkClientAdapter } from './mcp-sdk-client.adapter';
import type { McpConnectionConfig } from '../../application/ports/mcp-client.port';
import {
  McpConnectionFailedError,
  McpConnectionTimeoutError,
} from '../../application/mcp.errors';
import { MarketplaceMcpIntegration } from '../../domain/integrations/marketplace-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import { randomUUID } from 'crypto';

jest.mock('@modelcontextprotocol/client', () => ({
  Client: jest.fn(),
  StreamableHTTPClientTransport: jest.fn(),
}));

const REQUEST_TIMEOUT = { timeout: 30000 };

describe('McpSdkClientAdapter', () => {
  let adapter: McpSdkClientAdapter;
  let clientMock: {
    connect: jest.Mock;
    close: jest.Mock;
    listTools: jest.Mock;
    listResources: jest.Mock;
    listResourceTemplates: jest.Mock;
    listPrompts: jest.Mock;
    callTool: jest.Mock;
    readResource: jest.Mock;
    getPrompt: jest.Mock;
  };

  const config: McpConnectionConfig = {
    serverUrl: 'https://mcp.example.com/mcp',
    headers: { Authorization: 'Bearer token-value' },
  };

  const buildAbortError = () => {
    const error = new Error('This operation was aborted');
    error.name = 'AbortError';
    return error;
  };

  beforeEach(() => {
    clientMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
      listResources: jest.fn().mockResolvedValue({ resources: [] }),
      listResourceTemplates: jest
        .fn()
        .mockResolvedValue({ resourceTemplates: [] }),
      listPrompts: jest.fn().mockResolvedValue({ prompts: [] }),
      callTool: jest.fn().mockResolvedValue({ content: [], isError: false }),
      readResource: jest.fn().mockResolvedValue({
        contents: [{ text: 'resource text', mimeType: 'text/plain' }],
      }),
      getPrompt: jest.fn().mockResolvedValue({ messages: [] }),
    };
    (Client as unknown as jest.Mock).mockImplementation(() => clientMock);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    adapter = new McpSdkClientAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listTools', () => {
    it('negotiates the newest supported MCP protocol revision', async () => {
      await adapter.listTools(config);

      expect(Client).toHaveBeenCalledWith(
        { name: 'ayunis-core', version: '1.0.0' },
        { versionNegotiation: { mode: 'auto' } },
      );
    });

    it('passes configured headers to the v2 HTTP transport', async () => {
      await adapter.listTools(config);

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL(config.serverUrl),
        {
          requestInit: { headers: config.headers },
          authProvider: undefined,
          onInsufficientScope: 'throw',
        },
      );
    });

    it('uses the guarded fetch boundary for OAuth transport requests', async () => {
      const integration = new MarketplaceMcpIntegration({
        orgId: randomUUID(),
        name: 'Council documents',
        serverUrl: config.serverUrl,
        auth: new NoAuthMcpIntegrationAuth(),
        marketplaceIdentifier: 'council-documents',
        configSchema: {
          authType: 'OAUTH',
          orgFields: [],
          userFields: [],
          oauth: { clientRegistration: 'automatic' },
        },
        orgConfigValues: {},
      });
      const authProvider = { tokens: jest.fn() };
      const providerFactory = {
        prepareRuntime: jest.fn().mockResolvedValue(authProvider),
      };
      const integrations = {
        findById: jest.fn().mockResolvedValue(integration),
      };
      const oauthFetch = { fetch: jest.fn() };
      adapter = new McpSdkClientAdapter(
        providerFactory as never,
        integrations as never,
        oauthFetch,
      );

      await adapter.listTools({
        serverUrl: config.serverUrl,
        oauth: {
          integrationId: integration.id,
          userId: randomUUID(),
          orgId: integration.orgId,
        },
      });

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
        new URL(config.serverUrl),
        expect.objectContaining({
          authProvider,
          fetchFn: oauthFetch.fetch,
        }),
      );
    });

    it('returns the tools reported by the server', async () => {
      const tools = [
        {
          name: 'search_registry',
          description: 'Search the registry',
          inputSchema: { type: 'object' },
        },
      ];
      clientMock.listTools.mockResolvedValue({ tools });

      await expect(adapter.listTools(config)).resolves.toEqual(tools);
      expect(clientMock.close).toHaveBeenCalled();
    });

    it('enforces the timeout through the SDK request options', async () => {
      await adapter.listTools(config);

      expect(clientMock.connect).toHaveBeenCalledWith(
        expect.anything(),
        REQUEST_TIMEOUT,
      );
      expect(clientMock.listTools).toHaveBeenCalledWith(
        undefined,
        REQUEST_TIMEOUT,
      );
    });

    it('still returns the result when closing the client fails', async () => {
      const tools = [
        {
          name: 'search_registry',
          description: 'Search the registry',
          inputSchema: { type: 'object' },
        },
      ];
      clientMock.listTools.mockResolvedValue({ tools });
      clientMock.close.mockRejectedValue(buildAbortError());

      await expect(adapter.listTools(config)).resolves.toEqual(tools);
    });

    it('preserves the operation error when closing the client also fails', async () => {
      clientMock.listTools.mockRejectedValue(
        new Error('MCP error -32001: Request timed out'),
      );
      clientMock.close.mockRejectedValue(buildAbortError());

      await expect(adapter.listTools(config)).rejects.toThrow(
        'Request timed out',
      );
    });

    it('closes the client when the operation fails', async () => {
      clientMock.listTools.mockRejectedValue(new Error('boom'));

      await expect(adapter.listTools(config)).rejects.toThrow('boom');
      expect(clientMock.close).toHaveBeenCalled();
    });
  });

  describe('request timeout forwarding', () => {
    it('passes the timeout to listResources', async () => {
      await adapter.listResources(config);

      expect(clientMock.listResources).toHaveBeenCalledWith(
        undefined,
        REQUEST_TIMEOUT,
      );
    });

    it('passes the timeout to listResourceTemplates', async () => {
      await adapter.listResourceTemplates(config);

      expect(clientMock.listResourceTemplates).toHaveBeenCalledWith(
        undefined,
        REQUEST_TIMEOUT,
      );
    });

    it('passes the timeout to listPrompts', async () => {
      await adapter.listPrompts(config);

      expect(clientMock.listPrompts).toHaveBeenCalledWith(
        undefined,
        REQUEST_TIMEOUT,
      );
    });

    it('passes the timeout to callTool', async () => {
      await adapter.callTool(config, {
        toolName: 'search_registry',
        parameters: { query: 'water supply' },
      });

      expect(clientMock.callTool).toHaveBeenCalledWith(
        { name: 'search_registry', arguments: { query: 'water supply' } },
        REQUEST_TIMEOUT,
      );
    });

    it('passes the timeout to readResource', async () => {
      await adapter.readResource(config, 'file://static.txt');

      expect(clientMock.readResource).toHaveBeenCalledWith(
        { uri: 'file://static.txt' },
        REQUEST_TIMEOUT,
      );
    });

    it('passes the timeout to getPrompt', async () => {
      await adapter.getPrompt(config, 'summarize', { topic: 'roads' });

      expect(clientMock.getPrompt).toHaveBeenCalledWith(
        { name: 'summarize', arguments: { topic: 'roads' } },
        REQUEST_TIMEOUT,
      );
    });
  });

  describe('timeout and abort classification', () => {
    // The DOMException Node mints for AbortController.abort() — name
    // 'AbortError', numeric code 20 — the exact shape of AppSignal
    // incident "20: This operation was aborted".
    const buildDomAbortError = () =>
      new DOMException('This operation was aborted', 'AbortError');

    const buildSdkTimeoutError = () =>
      Object.assign(new Error('Request timed out'), {
        name: 'SdkError',
        code: 'REQUEST_TIMEOUT',
      });

    it('maps a raw AbortError from an operation to McpConnectionTimeoutError', async () => {
      clientMock.listTools.mockRejectedValue(buildDomAbortError());

      await expect(adapter.listTools(config)).rejects.toThrow(
        McpConnectionTimeoutError,
      );
    });

    it('maps an SDK request timeout during connect to McpConnectionTimeoutError', async () => {
      clientMock.connect.mockRejectedValue(buildSdkTimeoutError());

      await expect(adapter.listTools(config)).rejects.toThrow(
        McpConnectionTimeoutError,
      );
    });

    it('maps an SDK request timeout from an operation to McpConnectionTimeoutError', async () => {
      clientMock.listPrompts.mockRejectedValue(buildSdkTimeoutError());

      await expect(adapter.listPrompts(config)).rejects.toThrow(
        McpConnectionTimeoutError,
      );
    });

    it('maps a version-negotiation failure whose cause is an abort', async () => {
      const negotiationError = Object.assign(
        new Error('Version negotiation probe failed'),
        {
          name: 'SdkError',
          code: 'ERA_NEGOTIATION_FAILED',
          data: { cause: buildDomAbortError() },
        },
      );
      clientMock.connect.mockRejectedValue(negotiationError);

      await expect(adapter.listTools(config)).rejects.toThrow(
        McpConnectionTimeoutError,
      );
    });

    it('produces a user-presentable message naming the 30s budget', async () => {
      clientMock.listTools.mockRejectedValue(buildDomAbortError());

      await expect(adapter.listTools(config)).rejects.toThrow(
        /did not respond within 30s/,
      );
    });

    it('keeps the original error on the non-serialized cause', async () => {
      const abortError = buildDomAbortError();
      clientMock.listTools.mockRejectedValue(abortError);

      const mapped = await adapter.listTools(config).catch((e: unknown) => e);

      expect((mapped as Error).cause).toBe(abortError);
    });
  });

  describe('connection failure classification', () => {
    // Undici wraps errno failures in `TypeError: fetch failed` with the
    // coded error on `cause` — the shape of incidents #409/#387.
    const buildFetchFailedError = (code: string, message: string) =>
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error(message), { code }),
      });

    it('maps a DNS failure from an operation to McpConnectionFailedError', async () => {
      clientMock.listTools.mockRejectedValue(
        buildFetchFailedError(
          'EAI_AGAIN',
          'getaddrinfo EAI_AGAIN core-connect.ayunis.de',
        ),
      );

      await expect(adapter.listTools(config)).rejects.toThrow(
        McpConnectionFailedError,
      );
    });

    it('maps a connection reset during connect to McpConnectionFailedError', async () => {
      clientMock.connect.mockRejectedValue(
        buildFetchFailedError('ECONNRESET', 'socket hang up'),
      );

      await expect(adapter.listTools(config)).rejects.toThrow(
        McpConnectionFailedError,
      );
    });

    it('keeps the original error on the non-serialized cause', async () => {
      const transportError = buildFetchFailedError(
        'ECONNRESET',
        'socket hang up',
      );
      clientMock.listTools.mockRejectedValue(transportError);

      const mapped = await adapter.listTools(config).catch((e: unknown) => e);

      expect((mapped as Error).cause).toBe(transportError);
    });

    it('passes non-transport operation errors through unchanged', async () => {
      const protocolError = new Error('Method not found');
      clientMock.listTools.mockRejectedValue(protocolError);

      await expect(adapter.listTools(config)).rejects.toBe(protocolError);
    });

    // Timeout errnos outside the SDK's own codes must classify too: their
    // raw span duplicates are suppressed (AYC-616), so an unclassified
    // timeout would leave the outage invisible on soft-return paths.
    it('maps an undici headers timeout to McpConnectionTimeoutError', async () => {
      clientMock.listTools.mockRejectedValue(
        buildFetchFailedError(
          'UND_ERR_HEADERS_TIMEOUT',
          'Headers Timeout Error',
        ),
      );

      await expect(adapter.listTools(config)).rejects.toThrow(
        McpConnectionTimeoutError,
      );
    });

    it('maps an AbortSignal.timeout DOMException to McpConnectionTimeoutError', async () => {
      clientMock.listTools.mockRejectedValue(
        new DOMException(
          'The operation was aborted due to timeout',
          'TimeoutError',
        ),
      );

      await expect(adapter.listTools(config)).rejects.toThrow(
        McpConnectionTimeoutError,
      );
    });

    it('maps timeouts on callTool as well', async () => {
      clientMock.callTool.mockRejectedValue(
        new DOMException('This operation was aborted', 'AbortError'),
      );

      await expect(
        adapter.callTool(config, { toolName: 'search', parameters: {} }),
      ).rejects.toThrow(McpConnectionTimeoutError);
    });

    it('passes non-timeout errors through unchanged', async () => {
      const authError = Object.assign(new Error('Unauthorized'), {
        code: 401,
      });
      clientMock.listTools.mockRejectedValue(authError);

      await expect(adapter.listTools(config)).rejects.toBe(authError);
    });
  });

  describe('validateConnection', () => {
    it('reports the connection as valid when all listings succeed', async () => {
      await expect(adapter.validateConnection(config)).resolves.toEqual({
        valid: true,
      });
    });

    it('reports the connection as valid even when closing the client fails', async () => {
      clientMock.close.mockRejectedValue(buildAbortError());

      await expect(adapter.validateConnection(config)).resolves.toEqual({
        valid: true,
      });
    });

    it('reports the underlying error message when a listing fails', async () => {
      clientMock.listResources.mockRejectedValue(
        new Error('MCP error -32001: Request timed out'),
      );

      await expect(adapter.validateConnection(config)).resolves.toEqual({
        valid: false,
        error: 'MCP error -32001: Request timed out',
      });
    });
  });
});
