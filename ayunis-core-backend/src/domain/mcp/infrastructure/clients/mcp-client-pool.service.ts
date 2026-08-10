import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import type { Client } from '@modelcontextprotocol/client';
import { createHash } from 'crypto';
import type {
  McpConnectionConfig,
  McpConnectionScope,
} from '../../application/ports/mcp-client.port';

const CLIENT_IDLE_TIMEOUT_MS = 60_000;
const MAX_IDLE_CLIENTS = 100;

interface CachedClient {
  key: string;
  scope: McpConnectionScope;
  client: Promise<Client>;
  activeOperations: number;
  idleTimer: NodeJS.Timeout | null;
  stale: boolean;
  closePromise?: Promise<void>;
}

@Injectable()
export class McpClientPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(McpClientPoolService.name);
  private readonly clients = new Map<string, CachedClient>();
  private readonly liveClients = new Set<CachedClient>();
  private shuttingDown = false;

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    const clients = [...this.liveClients];
    this.clients.clear();
    for (const client of clients) this.markStale(client);
    await Promise.all(clients.map((client) => this.closeClient(client)));
  }

  async withClient<T>(
    config: McpConnectionConfig,
    createClient: () => Promise<Client>,
    operation: (client: Client) => Promise<T>,
  ): Promise<T> {
    const cached = this.acquireClient(config, createClient);
    try {
      return await operation(await cached.client);
    } catch (error) {
      if (!this.isMethodNotFoundError(error)) this.evictClient(cached);
      throw error;
    } finally {
      await this.releaseClient(cached);
    }
  }

  async invalidateConnections(scope: McpConnectionScope): Promise<void> {
    const clients = [...this.clients.values()].filter((client) =>
      this.matchesScope(client.scope, scope),
    );
    for (const client of clients) this.evictClient(client);
    await Promise.all(
      clients
        .filter((client) => client.activeOperations === 0)
        .map((client) => this.closeClient(client)),
    );
  }

  private acquireClient(
    config: McpConnectionConfig,
    createClient: () => Promise<Client>,
  ): CachedClient {
    if (this.shuttingDown) {
      throw new Error('MCP client pool is shutting down');
    }
    const key = this.connectionKey(config);
    const cached = this.clients.get(key);
    if (cached) {
      if (cached.idleTimer) clearTimeout(cached.idleTimer);
      cached.idleTimer = null;
      cached.activeOperations += 1;
      this.clients.delete(key);
      this.clients.set(key, cached);
      return cached;
    }
    const client: CachedClient = {
      key,
      scope: config.connectionScope,
      client: createClient(),
      activeOperations: 1,
      idleTimer: null,
      stale: false,
    };
    this.clients.set(key, client);
    this.liveClients.add(client);
    return client;
  }

  private async releaseClient(client: CachedClient): Promise<void> {
    client.activeOperations -= 1;
    if (client.activeOperations > 0) return;
    if (client.stale) {
      await this.closeClient(client);
      return;
    }
    client.idleTimer = setTimeout(
      () => this.expireIdleClient(client),
      CLIENT_IDLE_TIMEOUT_MS,
    );
    client.idleTimer.unref();
    await this.trimIdleClients();
  }

  private async trimIdleClients(): Promise<void> {
    const idleClients = [...this.clients.values()].filter(
      (client) => client.activeOperations === 0,
    );
    const excess = idleClients.slice(0, -MAX_IDLE_CLIENTS);
    for (const client of excess) this.evictClient(client);
    await Promise.all(excess.map((client) => this.closeClient(client)));
  }

  private matchesScope(
    candidate: McpConnectionScope,
    requested: McpConnectionScope,
  ): boolean {
    return (
      candidate.orgId === requested.orgId &&
      candidate.integrationId === requested.integrationId &&
      (requested.userId === undefined || candidate.userId === requested.userId)
    );
  }

  private expireIdleClient(client: CachedClient): void {
    client.idleTimer = null;
    if (this.clients.get(client.key) !== client) return;
    this.clients.delete(client.key);
    this.markStale(client);
    void this.closeClient(client);
  }

  private isMethodNotFoundError(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === -32601,
    );
  }

  private evictClient(client: CachedClient): void {
    if (this.clients.get(client.key) === client) {
      this.clients.delete(client.key);
    }
    this.markStale(client);
  }

  private markStale(client: CachedClient): void {
    client.stale = true;
    if (client.idleTimer) clearTimeout(client.idleTimer);
    client.idleTimer = null;
  }

  private closeClient(client: CachedClient): Promise<void> {
    client.closePromise ??= client.client
      .then(
        (connected) => this.closeQuietly(connected),
        () => undefined,
      )
      .finally(() => this.liveClients.delete(client));
    return client.closePromise;
  }

  private connectionKey(config: McpConnectionConfig): string {
    const headers = Object.entries(config.headers ?? {}).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    const scope = [
      config.connectionScope.orgId,
      config.connectionScope.integrationId,
      config.connectionScope.userId ?? null,
    ];
    const oauth = config.oauth
      ? [config.oauth.integrationId, config.oauth.userId, config.oauth.orgId]
      : null;
    return createHash('sha256')
      .update(JSON.stringify([config.serverUrl, headers, scope, oauth]))
      .digest('base64url');
  }

  private async closeQuietly(client: Client): Promise<void> {
    try {
      await client.close();
    } catch (error) {
      this.logger.warn('Failed to close MCP client', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
