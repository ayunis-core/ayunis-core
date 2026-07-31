import { randomUUID } from 'crypto';
import type { DiscoveredCapabilities } from './mcp-capability-cache.service';
import { McpCapabilityCacheService } from './mcp-capability-cache.service';

describe('McpCapabilityCacheService', () => {
  let cache: McpCapabilityCacheService;

  const integrationId = randomUUID();
  const userId = randomUUID();

  const buildCapabilities = (toolName: string): DiscoveredCapabilities => ({
    tools: [
      {
        name: toolName,
        description: 'Search the registry',
        inputSchema: { type: 'object' },
      },
    ],
    resources: [],
    resourceTemplates: [],
    prompts: [],
  });

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new McpCapabilityCacheService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads capabilities through the loader on first access', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));

    const result = await cache.getOrLoad(integrationId, userId, loader);

    expect(result.tools[0].name).toBe('search_registry');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('serves a cached result without re-invoking the loader', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));

    await cache.getOrLoad(integrationId, userId, loader);
    const result = await cache.getOrLoad(integrationId, userId, loader);

    expect(result.tools[0].name).toBe('search_registry');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('re-discovers after the success TTL expires', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));

    await cache.getOrLoad(integrationId, userId, loader);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    await cache.getOrLoad(integrationId, userId, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight discovery between concurrent callers', async () => {
    let resolveLoad: (value: DiscoveredCapabilities) => void;
    const loader = jest.fn().mockReturnValue(
      new Promise<DiscoveredCapabilities>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const first = cache.getOrLoad(integrationId, userId, loader);
    const second = cache.getOrLoad(integrationId, userId, loader);
    resolveLoad!(buildCapabilities('search_registry'));

    await expect(first).resolves.toEqual(await second);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('caches a discovery failure and rethrows it without re-invoking the loader', async () => {
    const failure = new Error('MCP error -32001: Request timed out');
    const loader = jest.fn().mockRejectedValue(failure);

    await expect(
      cache.getOrLoad(integrationId, userId, loader),
    ).rejects.toThrow(failure);
    await expect(
      cache.getOrLoad(integrationId, userId, loader),
    ).rejects.toThrow(failure);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('retries discovery once the failure TTL expires', async () => {
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error('MCP error -32001: Request timed out'))
      .mockResolvedValue(buildCapabilities('search_registry'));

    await expect(
      cache.getOrLoad(integrationId, userId, loader),
    ).rejects.toThrow('Request timed out');
    jest.advanceTimersByTime(30 * 1000 + 1);
    const result = await cache.getOrLoad(integrationId, userId, loader);

    expect(result.tools[0].name).toBe('search_registry');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('caches per user so user-specific credentials stay isolated', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));
    const otherUserId = randomUUID();

    await cache.getOrLoad(integrationId, userId, loader);
    await cache.getOrLoad(integrationId, otherUserId, loader);
    await cache.getOrLoad(integrationId, undefined, loader);

    expect(loader).toHaveBeenCalledTimes(3);
  });

  it('invalidates every entry of an integration across users', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));
    const otherIntegrationId = randomUUID();

    await cache.getOrLoad(integrationId, userId, loader);
    await cache.getOrLoad(integrationId, undefined, loader);
    await cache.getOrLoad(otherIntegrationId, userId, loader);

    cache.invalidate(integrationId);

    await cache.getOrLoad(integrationId, userId, loader);
    await cache.getOrLoad(integrationId, undefined, loader);
    await cache.getOrLoad(otherIntegrationId, userId, loader);

    expect(loader).toHaveBeenCalledTimes(5);
  });

  it('keeps sharing an in-flight load even past the success TTL', async () => {
    let resolveLoad: (value: DiscoveredCapabilities) => void;
    const loader = jest.fn().mockReturnValue(
      new Promise<DiscoveredCapabilities>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    const first = cache.getOrLoad(integrationId, userId, loader);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    const second = cache.getOrLoad(integrationId, userId, loader);
    resolveLoad!(buildCapabilities('search_registry'));

    await expect(first).resolves.toEqual(await second);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('caches a loader that throws synchronously as a failure', async () => {
    const loader = jest.fn(() => {
      throw new Error('secret decryption failed');
    });

    await expect(
      cache.getOrLoad(integrationId, userId, loader),
    ).rejects.toThrow('secret decryption failed');
    await expect(
      cache.getOrLoad(integrationId, userId, loader),
    ).rejects.toThrow('secret decryption failed');

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('invalidates only the given user when a userId is provided', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));
    const otherUserId = randomUUID();

    await cache.getOrLoad(integrationId, userId, loader);
    await cache.getOrLoad(integrationId, otherUserId, loader);
    await cache.getOrLoad(integrationId, undefined, loader);

    cache.invalidate(integrationId, userId);

    await cache.getOrLoad(integrationId, userId, loader);
    await cache.getOrLoad(integrationId, otherUserId, loader);
    await cache.getOrLoad(integrationId, undefined, loader);

    expect(loader).toHaveBeenCalledTimes(4);
  });

  it('prunes expired entries on access regardless of their key', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));
    const otherIntegrationId = randomUUID();
    const thirdIntegrationId = randomUUID();

    await cache.getOrLoad(integrationId, userId, loader);
    await cache.getOrLoad(otherIntegrationId, userId, loader);
    expect(cache.size()).toBe(2);

    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    await cache.getOrLoad(thirdIntegrationId, userId, loader);

    expect(cache.size()).toBe(1);
  });

  it('does not retain a load that was invalidated while in flight', async () => {
    let resolveLoad: (value: DiscoveredCapabilities) => void;
    const loader = jest
      .fn()
      .mockReturnValueOnce(
        new Promise<DiscoveredCapabilities>((resolve) => {
          resolveLoad = resolve;
        }),
      )
      .mockResolvedValue(buildCapabilities('fresh_tool'));

    const pending = cache.getOrLoad(integrationId, userId, loader);
    cache.invalidate(integrationId);
    resolveLoad!(buildCapabilities('stale_tool'));
    await pending;

    const result = await cache.getOrLoad(integrationId, userId, loader);

    expect(result.tools[0].name).toBe('fresh_tool');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('clears all entries', async () => {
    const loader = jest
      .fn()
      .mockResolvedValue(buildCapabilities('search_registry'));

    await cache.getOrLoad(integrationId, userId, loader);
    cache.clear();
    await cache.getOrLoad(integrationId, userId, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
