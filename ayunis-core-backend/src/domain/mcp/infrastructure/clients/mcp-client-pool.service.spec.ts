import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { Client } from '@modelcontextprotocol/client';
import { randomUUID } from 'crypto';
import type { McpConnectionConfig } from 'src/domain/mcp/application/ports/mcp-client.port';
import { McpClientPoolService } from './mcp-client-pool.service';

describe('McpClientPoolService', () => {
  let pool: McpClientPoolService;
  let client: Client;
  let close: jest.Mock;
  let createClient: jest.Mock;

  const config: McpConnectionConfig = {
    serverUrl: 'https://mcp.example.com/mcp',
    headers: { Authorization: 'Bearer council-token' },
    connectionScope: {
      orgId: randomUUID(),
      integrationId: randomUUID(),
      userId: randomUUID(),
    },
  };

  beforeEach(() => {
    close = jest.fn().mockResolvedValue(undefined);
    client = { close } as unknown as Client;
    createClient = jest.fn().mockResolvedValue(client);
    pool = new McpClientPoolService(createPinoLoggerMock());
  });

  afterEach(async () => {
    await pool.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('reuses one client for repeated operations with the same config', async () => {
    await pool.withClient(config, createClient, async () => 'tools');
    await pool.withClient(config, createClient, async () => 'resources');

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('isolates clients with different connection timeout budgets', async () => {
    await pool.withClient(config, createClient, async () => undefined, {
      connectTimeout: 10000,
    });
    await pool.withClient(config, createClient, async () => undefined, {
      connectTimeout: 30000,
    });

    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it('reuses a client when equivalent headers have different insertion order', async () => {
    await pool.withClient(
      {
        ...config,
        headers: { Authorization: 'Bearer council-token', Region: 'north' },
      },
      createClient,
      async () => undefined,
    );
    await pool.withClient(
      {
        ...config,
        headers: { Region: 'north', Authorization: 'Bearer council-token' },
      },
      createClient,
      async () => undefined,
    );

    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('does not share clients across different credentials', async () => {
    await pool.withClient(config, createClient, async () => undefined);
    await pool.withClient(
      {
        ...config,
        headers: { Authorization: 'Bearer another-council-token' },
      },
      createClient,
      async () => undefined,
    );

    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it('does not share sessions across different integration scopes', async () => {
    await pool.withClient(
      {
        ...config,
        connectionScope: {
          ...config.connectionScope,
          integrationId: randomUUID(),
        },
      },
      createClient,
      async () => undefined,
    );
    await pool.withClient(
      {
        ...config,
        connectionScope: {
          ...config.connectionScope,
          integrationId: randomUUID(),
        },
      },
      createClient,
      async () => undefined,
    );

    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it('invalidates one user session without closing other integration sessions', async () => {
    const otherUserConfig: McpConnectionConfig = {
      ...config,
      connectionScope: {
        ...config.connectionScope,
        userId: randomUUID(),
      },
    };
    await pool.withClient(config, createClient, async () => undefined);
    await pool.withClient(otherUserConfig, createClient, async () => undefined);

    await pool.invalidateConnections(config.connectionScope);
    await pool.withClient(config, createClient, async () => undefined);
    await pool.withClient(otherUserConfig, createClient, async () => undefined);

    expect(close).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledTimes(3);
  });

  it('invalidates every user session for an integration', async () => {
    await pool.withClient(config, createClient, async () => undefined);
    await pool.withClient(
      {
        ...config,
        connectionScope: {
          ...config.connectionScope,
          userId: randomUUID(),
        },
      },
      createClient,
      async () => undefined,
    );

    await pool.invalidateConnections({
      orgId: config.connectionScope.orgId,
      integrationId: config.connectionScope.integrationId,
    });

    expect(close).toHaveBeenCalledTimes(2);
  });

  it('limits the idle pool to 100 clients', async () => {
    for (let index = 0; index <= 100; index += 1) {
      await pool.withClient(
        {
          ...config,
          headers: { Authorization: `Bearer council-token-${index}` },
        },
        createClient,
        async () => undefined,
      );
    }

    expect(createClient).toHaveBeenCalledTimes(101);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes a client after it has been idle for one minute', async () => {
    jest.useFakeTimers();
    try {
      await pool.withClient(config, createClient, async () => undefined);

      await jest.advanceTimersByTimeAsync(59_999);
      expect(close).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(1);
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('closes cached clients when the module is destroyed', async () => {
    await pool.withClient(config, createClient, async () => undefined);

    await pool.onModuleDestroy();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does not create clients after module teardown starts', async () => {
    await pool.onModuleDestroy();

    await expect(
      pool.withClient(config, createClient, async () => undefined),
    ).rejects.toThrow('MCP client pool is shutting down');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('keeps the client after an unsupported capability error', async () => {
    const methodNotFound = Object.assign(new Error('Method not found'), {
      code: -32601,
    });

    await expect(
      pool.withClient(config, createClient, async () => {
        throw methodNotFound;
      }),
    ).rejects.toBe(methodNotFound);
    await pool.withClient(config, createClient, async () => undefined);

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('evicts and closes a client after an operation failure', async () => {
    await expect(
      pool.withClient(config, createClient, async () => {
        throw new Error('temporary protocol failure');
      }),
    ).rejects.toThrow('temporary protocol failure');
    await pool.withClient(config, createClient, async () => undefined);

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes an evicted client during shutdown while another operation is active', async () => {
    let finishOperation!: () => void;
    const activeOperation = pool.withClient(
      config,
      createClient,
      () =>
        new Promise<void>((resolve) => {
          finishOperation = resolve;
        }),
    );

    await expect(
      pool.withClient(config, createClient, async () => {
        throw new Error('temporary protocol failure');
      }),
    ).rejects.toThrow('temporary protocol failure');
    await pool.onModuleDestroy();

    expect(close).toHaveBeenCalledTimes(1);
    finishOperation();
    await expect(activeOperation).resolves.toBeUndefined();
  });

  it('preserves the operation error when closing the client also fails', async () => {
    close.mockRejectedValue(new Error('transport close failed'));

    await expect(
      pool.withClient(config, createClient, async () => {
        throw new Error('operation failed');
      }),
    ).rejects.toThrow('operation failed');
  });
});
