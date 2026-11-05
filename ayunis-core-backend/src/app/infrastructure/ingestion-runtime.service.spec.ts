import type { DiscoveryService } from '@nestjs/core';
import { WorkerHost } from '@nestjs/bullmq';
import type { DataSource } from 'typeorm';
import { IngestionRuntimeService } from './ingestion-runtime.service';

jest.mock('src/common/process/ingestion-topology', () => ({
  ingestionTopology: { isWorker: true, consumesQueues: true },
}));

describe('ingestion worker readiness and shutdown', () => {
  let runtime: IngestionRuntimeService;
  let running: boolean;
  let databaseReady: boolean;
  let consumersPresent: boolean;
  let redisReady: boolean;
  let releaseDrain: (() => void) | undefined;
  let drainGate: Promise<void> | undefined;
  beforeEach(() => {
    running = true;
    databaseReady = true;
    consumersPresent = true;
    redisReady = true;
    releaseDrain = undefined;
    drainGate = undefined;
    const worker = {
      isRunning: () => running,
      isPaused: () => false,
      waitUntilReady: async () => undefined,
      client: Promise.resolve({
        status: 'ready',
        get: async () => {
          if (!redisReady) throw new Error('Redis unavailable');
          return null;
        },
      }),
      toKey: (type: string) => `test:${type}`,
      close: async () => {
        await drainGate;
        running = false;
      },
    };
    runtime = new IngestionRuntimeService(
      {
        getProviders: () =>
          (consumersPresent
            ? ['document-processing', 'data-source-processing', 'url-crawl']
            : []
          ).map((name) => ({
            instance: Object.assign(Object.create(WorkerHost.prototype), {
              _worker: { ...worker, name },
            }),
          })),
      } as unknown as DiscoveryService,
      {
        query: async () => {
          if (!databaseReady)
            throw new Error('private database connection failure');
        },
      } as unknown as DataSource,
    );
  });
  afterEach(async () => {
    await runtime.onModuleDestroy();
  });
  it('serves only readiness and becomes unhealthy when the database is unavailable', async () => {
    const port = await runtime.startHealthServer(0);
    const url = `http://127.0.0.1:${port}`;
    expect((await fetch(url + '/health')).status).toBe(200);
    expect((await fetch(url + '/api/threads')).status).toBe(404);
    databaseReady = false;
    const response = await fetch(url + '/health');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'error' });
  });
  it('does not report healthy when a queue consumer is not running', async () => {
    const port = await runtime.startHealthServer(0);
    running = false;
    expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(503);
  });
  it('returns unavailable when Redis stops responding', async () => {
    const port = await runtime.startHealthServer(0);
    redisReady = false;
    expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(503);
  });
  it('waits for active workers to drain before completing destruction', async () => {
    drainGate = new Promise<void>((resolve) => {
      releaseDrain = resolve;
    });
    let destroyed = false;
    const shutdown = runtime.onModuleDestroy().then(() => {
      destroyed = true;
    });
    await Promise.resolve();
    expect(destroyed).toBe(false);
    expect(running).toBe(true);
    releaseDrain!();
    await shutdown;
    expect(destroyed).toBe(true);
    expect(running).toBe(false);
  });
  it('rejects startup without the expected queue consumers', async () => {
    consumersPresent = false;
    await expect(runtime.startHealthServer(0)).rejects.toThrow(
      'Missing ingestion queue consumers',
    );
  });
  it('closes readiness and drains its workers during module destruction', async () => {
    const port = await runtime.startHealthServer(0);
    await runtime.onModuleDestroy();
    expect(running).toBe(false);
    await expect(fetch(`http://127.0.0.1:${port}/health`)).rejects.toThrow();
  });
});
