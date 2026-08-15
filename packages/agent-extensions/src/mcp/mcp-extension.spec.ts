import type {
  CallToolResult,
  Implementation,
  ListToolsResult,
  Tool as McpTool,
  Transport,
} from '@modelcontextprotocol/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import {
  StdioClientTransport,
  type StdioServerParameters,
} from '@modelcontextprotocol/client/stdio';
import { describe, expect, it, vi } from 'vitest';

import type { ToolExecutionContext } from '@ayunis/agent-runtime';

import {
  initializeMcpExtension,
  type McpClient,
  type McpClientFactory,
} from './mcp-extension';
import {
  createStdioTransport,
  createStreamableHttpTransport,
  type McpTransportFactory,
} from './transports';

const transport = {} as Transport;
const transportFactory: McpTransportFactory = () => transport;
const clientInfo: Implementation = { name: 'test-client', version: '1.0.0' };

const discoveredTool = (
  name: string,
  inputSchema: McpTool['inputSchema'] = {
    type: 'object',
    properties: {},
  },
): McpTool => ({ name, description: `${name} description`, inputSchema });

const fakeClient = (
  tools: readonly McpTool[] = [],
  overrides: Partial<McpClient> = {},
): McpClient => ({
  connect: vi.fn().mockResolvedValue(undefined),
  listTools: vi
    .fn()
    .mockResolvedValue({ tools: [...tools] } satisfies ListToolsResult),
  callTool: vi.fn().mockResolvedValue({ content: [] } satisfies CallToolResult),
  close: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const clientFactory = (...clients: McpClient[]): McpClientFactory => {
  const queue = [...clients];
  return vi.fn(() => {
    const client = queue.shift();
    if (client === undefined) {
      throw new Error('No fake client configured');
    }
    return client;
  });
};

const executionContext = (signal?: AbortSignal): ToolExecutionContext => ({
  context: {} as ToolExecutionContext['context'],
  toolCallId: 'call-1',
  signal,
  emit: vi.fn(),
  runChild: vi.fn(),
});

describe('MCP extension initialization', () => {
  it('connects every client and discovers each complete SDK-aggregated tool list once', async () => {
    const first = fakeClient([discoveredTool('first')]);
    const second = fakeClient([
      discoveredTool('page-one'),
      discoveredTool('page-two'),
    ]);
    const createClient = clientFactory(first, second);

    const extension = await initializeMcpExtension(
      {
        clientInfo,
        servers: [
          { name: 'alpha', transport: transportFactory },
          { name: 'beta', transport: transportFactory },
        ],
      },
      createClient,
    );

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(first.connect).toHaveBeenCalledOnce();
    expect(second.connect).toHaveBeenCalledOnce();
    expect(first.listTools).toHaveBeenCalledOnce();
    expect(second.listTools).toHaveBeenCalledOnce();
    expect(first.listTools).toHaveBeenCalledWith(undefined, undefined);
    expect(second.listTools).toHaveBeenCalledWith(undefined, undefined);
    expect(extension.tools?.map(({ name }) => name)).toEqual([
      'first',
      'page-one',
      'page-two',
    ]);
  });

  it('maps discovered input schemas to runtime parameters without loss', async () => {
    const inputSchema = {
      type: 'object' as const,
      properties: {
        city: { type: 'string', enum: ['Berlin', 'Munich'] },
      },
      required: ['city'],
      additionalProperties: false,
    };
    const client = fakeClient([discoveredTool('weather', inputSchema)]);

    const extension = await initializeMcpExtension(
      {
        clientInfo,
        servers: [{ name: 'weather', transport: transportFactory }],
      },
      clientFactory(client),
    );

    expect(extension.tools?.[0].parameters).toBe(inputSchema);
  });

  it('rejects duplicate server names before opening a client', async () => {
    const createClient = clientFactory();

    await expect(
      initializeMcpExtension(
        {
          clientInfo,
          servers: [
            { name: 'duplicate', transport: transportFactory },
            { name: 'duplicate', transport: transportFactory },
          ],
        },
        createClient,
      ),
    ).rejects.toThrow('Duplicate MCP server name: duplicate');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects duplicate discovered tool names and closes every opened client', async () => {
    const first = fakeClient([discoveredTool('duplicate')]);
    const second = fakeClient([discoveredTool('duplicate')]);

    await expect(
      initializeMcpExtension(
        {
          clientInfo,
          servers: [
            { name: 'first', transport: transportFactory },
            { name: 'second', transport: transportFactory },
          ],
        },
        clientFactory(first, second),
      ),
    ).rejects.toThrow('Duplicate MCP tool name: duplicate');
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
  });

  it.each(['connect', 'listTools'] as const)(
    'closes every opened client when %s fails',
    async (operation) => {
      const first = fakeClient([discoveredTool('first')]);
      const failing = fakeClient([], {
        [operation]: vi
          .fn()
          .mockRejectedValue(new Error(`${operation} failed`)),
      });

      await expect(
        initializeMcpExtension(
          {
            clientInfo,
            servers: [
              { name: 'first', transport: transportFactory },
              { name: 'failing', transport: transportFactory },
            ],
          },
          clientFactory(first, failing),
        ),
      ).rejects.toThrow(`${operation} failed`);
      expect(first.close).toHaveBeenCalledOnce();
      expect(failing.close).toHaveBeenCalledOnce();
    },
  );
});

describe('MCP runtime tools', () => {
  it('delegates the original call with request options and preserves the MCP result', async () => {
    const result: CallToolResult = {
      content: [{ type: 'text', text: 'forecast' }],
      structuredContent: { temperature: 21 },
      isError: true,
    };
    const client = fakeClient([discoveredTool('weather')], {
      callTool: vi.fn().mockResolvedValue(result),
    });
    const extension = await initializeMcpExtension(
      {
        clientInfo,
        servers: [
          {
            name: 'weather-server',
            transport: transportFactory,
            requestOptions: { timeout: 12_345 },
          },
        ],
      },
      clientFactory(client),
    );
    const abortController = new AbortController();

    const output = await extension.tools?.[0].execute?.(
      { city: 'Berlin' },
      executionContext(abortController.signal),
    );

    expect(client.callTool).toHaveBeenCalledWith(
      { name: 'weather', arguments: { city: 'Berlin' } },
      { timeout: 12_345, signal: abortController.signal },
    );
    expect(output).toEqual({
      result:
        '{"content":[{"type":"text","text":"forecast"}],"structuredContent":{"temperature":21},"isError":true}',
      isError: true,
    });
  });
});

describe('MCP client lifetime', () => {
  it('closes every client once even when another close fails', async () => {
    const first = fakeClient([], {
      close: vi.fn().mockRejectedValue(new Error('first close failed')),
    });
    const second = fakeClient([], {
      close: vi.fn().mockRejectedValue(new Error('second close failed')),
    });
    const extension = await initializeMcpExtension(
      {
        clientInfo,
        servers: [
          { name: 'first', transport: transportFactory },
          { name: 'second', transport: transportFactory },
        ],
      },
      clientFactory(first, second),
    );

    const error = await extension
      .dispose?.()
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toHaveLength(2);
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
    await expect(extension.dispose?.()).resolves.toBeUndefined();
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
  });
});

describe('MCP transport factories', () => {
  it('creates the declared Streamable HTTP transport with caller-owned options', async () => {
    const requestInit = { headers: { Authorization: 'Bearer host-owned' } };
    const factory = createStreamableHttpTransport(
      new URL('https://mcp.example.test'),
      { requestInit },
    );

    expect(await factory()).toBeInstanceOf(StreamableHTTPClientTransport);
  });

  it('creates the declared stdio transport with caller-owned process parameters', async () => {
    const parameters: StdioServerParameters = {
      command: 'mcp-server',
      args: ['--stdio'],
      env: { HOST_OWNED: 'true' },
    };
    const factory = createStdioTransport(parameters);

    expect(await factory()).toBeInstanceOf(StdioClientTransport);
  });
});
