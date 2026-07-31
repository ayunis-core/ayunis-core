import { Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpSdkClientAdapter } from './mcp-sdk-client.adapter';
import type { McpConnectionConfig } from '../../application/ports/mcp-client.port';

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn(),
}));
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
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

    it('passes the timeout to callTool after the result schema slot', async () => {
      await adapter.callTool(config, {
        toolName: 'search_registry',
        parameters: { query: 'water supply' },
      });

      expect(clientMock.callTool).toHaveBeenCalledWith(
        { name: 'search_registry', arguments: { query: 'water supply' } },
        undefined,
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
