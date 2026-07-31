import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { McpTool, McpResource, McpPrompt } from '../ports/mcp-client.port';

export interface DiscoveredCapabilities {
  readonly tools: readonly McpTool[];
  readonly resources: readonly McpResource[];
  readonly resourceTemplates: readonly McpResource[];
  readonly prompts: readonly McpPrompt[];
}

interface CacheEntry {
  promise: Promise<DiscoveredCapabilities>;
  // Undefined while the load is in flight — pending entries never expire, so
  // concurrent callers always share the same load no matter how long it runs.
  expiresAt?: number;
}

const SUCCESS_TTL_MS = 5 * 60 * 1000;
// Failures are cached briefly so a slow or down MCP server is not hammered
// with a fresh 30s-timeout connection attempt on every message, while still
// recovering quickly once the server is healthy again.
const FAILURE_TTL_MS = 30 * 1000;

/**
 * In-process TTL cache for MCP capability discovery. Discovery opens several
 * HTTP connections per integration, so serving repeat lookups from memory
 * keeps message sends from re-querying every MCP server each time.
 *
 * Entries are keyed per integration and user because marketplace integrations
 * resolve per-user credentials. The cache is per-instance; cross-instance
 * invalidation is intentionally not handled — the short TTLs bound staleness.
 */
@Injectable()
export class McpCapabilityCacheService {
  private readonly entries = new Map<string, CacheEntry>();

  getOrLoad(
    integrationId: UUID,
    userId: UUID | undefined,
    loader: () => Promise<DiscoveredCapabilities>,
  ): Promise<DiscoveredCapabilities> {
    this.pruneExpired();

    const key = this.buildKey(integrationId, userId);
    const existing = this.entries.get(key);
    if (existing) {
      return existing.promise;
    }

    // Normalized through Promise.resolve so a synchronously throwing loader
    // is cached and rethrown like any other failure.
    const promise = Promise.resolve().then(loader);
    const entry: CacheEntry = { promise };
    this.entries.set(key, entry);

    promise.then(
      () => {
        entry.expiresAt = Date.now() + SUCCESS_TTL_MS;
      },
      () => {
        entry.expiresAt = Date.now() + FAILURE_TTL_MS;
      },
    );

    return promise;
  }

  /**
   * Removes cached capabilities for an integration — all users' entries, or
   * only one user's when `userId` is given (e.g. that user changed their own
   * credentials and no one else's discovery is affected).
   */
  invalidate(integrationId: UUID, userId?: UUID): void {
    if (userId !== undefined) {
      this.entries.delete(this.buildKey(integrationId, userId));
      return;
    }

    const prefix = `${integrationId}:`;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }

  // Expired entries would otherwise linger until their exact key is accessed
  // again; sweeping on every lookup bounds the map to live entries. The map
  // stays small (integrations × active users), so a full scan is cheap.
  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }

  private buildKey(integrationId: UUID, userId: UUID | undefined): string {
    return `${integrationId}:${userId ?? 'org'}`;
  }
}
