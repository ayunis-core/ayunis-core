import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { DataSource } from 'typeorm';
import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from 'http';
import type { Worker } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';

/**
 * Readiness and graceful shutdown for a process whose only job is to work
 * through BullMQ queues. The worker's entry point names the queues it must
 * serve; nothing here is specific to one kind of worker.
 */
@Injectable()
export class QueueWorkerRuntimeService implements OnModuleDestroy {
  private requiredQueues: readonly string[] = [];
  private server?: Server;
  private stopping?: Promise<void>;

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly database: DataSource,
  ) {}

  async startHealthServer(
    port: number,
    requiredQueues: readonly string[],
  ): Promise<number> {
    if (!Number.isInteger(port) || port < 0 || port > 65535)
      throw new Error('Invalid worker health port');
    this.requiredQueues = requiredQueues;
    const workers = this.discoverWorkers();
    this.validateConsumers(workers);
    await Promise.all(workers.map((worker) => worker.waitUntilReady()));
    this.server = createServer((request, response) => {
      void this.respond(request, response);
    });
    await new Promise<void>((resolve, reject) =>
      this.server!.once('error', reject).listen(port, '127.0.0.1', resolve),
    );
    const address = this.server.address();
    if (!address || typeof address === 'string')
      throw new Error('Worker health server did not bind a port');
    return address.port;
  }

  onModuleDestroy(): Promise<void> {
    this.stopping ??= this.shutdown();
    return this.stopping;
  }

  private discoverWorkers(): Worker<unknown, unknown>[] {
    return this.discovery
      .getProviders()
      .flatMap(({ instance }) =>
        instance instanceof WorkerHost
          ? [instance.worker as Worker<unknown, unknown>]
          : [],
      );
  }

  private validateConsumers(workers: Worker<unknown, unknown>[]): void {
    const registered = new Set(workers.map((worker) => worker.name));
    const missing = this.requiredQueues.filter((name) => !registered.has(name));
    if (missing.length > 0) {
      throw new Error(`Missing queue consumers: ${missing.join(', ')}`);
    }
  }

  private async respond(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (request.method !== 'GET' || request.url !== '/health') {
      response.writeHead(404);
      response.end();
      return;
    }
    const ready = await this.checkReadiness();
    response.writeHead(ready ? 200 : 503, {
      'content-type': 'application/json',
    });
    response.end(JSON.stringify({ status: ready ? 'ok' : 'error' }));
  }

  private async checkReadiness(): Promise<boolean> {
    if (this.stopping) return false;
    try {
      const workers = this.discoverWorkers();
      this.validateConsumers(workers);
      if (workers.some((worker) => !worker.isRunning() || worker.isPaused()))
        return false;
      await this.database.query('SELECT 1');
      await Promise.all(
        workers.map(async (worker) => {
          const client = await worker.client;
          if (client.status !== 'ready')
            throw new Error('Queue connection is not ready');
          await client.get(worker.toKey('id'));
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private async shutdown(): Promise<void> {
    await this.closeHealthServer();
    // Drain during module destruction, before TypeORM closes on application shutdown.
    const results = await Promise.allSettled(
      this.discoverWorkers().map((worker) => worker.close()),
    );
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length)
      throw new AggregateError(
        failures.map((result): unknown => result.reason),
        'Queue workers failed to close',
      );
  }

  private async closeHealthServer(): Promise<void> {
    const server = this.server;
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
