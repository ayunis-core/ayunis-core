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
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';
import { ingestionTopology } from 'src/common/process/ingestion-topology';
@Injectable()
export class IngestionRuntimeService implements OnModuleDestroy {
  private readonly worker = ingestionTopology.isWorker;
  private readonly consuming = ingestionTopology.consumesQueues;
  private server?: Server;
  private stopping?: Promise<void>;

  constructor(
    private readonly modules: DiscoveryService,
    private readonly database: DataSource,
  ) {}

  async startHealthServer(port: number): Promise<number> {
    if (!this.worker)
      throw new Error(
        'Worker readiness is only available in the worker process',
      );
    if (!Number.isInteger(port) || port < 0 || port > 65535)
      throw new Error('Invalid INGESTION_WORKER_HEALTH_PORT');
    this.requireConsumers(this.workers());
    await Promise.all(this.workers().map((worker) => worker.waitUntilReady()));
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
    this.stopping ??= this.drain();
    return this.stopping;
  }

  private workers(): Worker<unknown, unknown>[] {
    if (!this.consuming) return [];
    return this.modules
      .getProviders()
      .flatMap(({ instance }) =>
        instance instanceof WorkerHost
          ? [instance.worker as Worker<unknown, unknown>]
          : [],
      );
  }

  private requireConsumers(workers: Worker<unknown, unknown>[]): void {
    const names = new Set(workers.map((worker) => worker.name));
    if (
      [
        DOCUMENT_PROCESSING_QUEUE,
        DATA_SOURCE_PROCESSING_QUEUE,
        URL_CRAWL_QUEUE,
      ].some((name) => !names.has(name))
    ) {
      throw new Error('Missing ingestion queue consumers');
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
    const ready = await this.ready();
    response.writeHead(ready ? 200 : 503, {
      'content-type': 'application/json',
    });
    response.end(JSON.stringify({ status: ready ? 'ok' : 'error' }));
  }

  private async ready(): Promise<boolean> {
    if (this.stopping) return false;
    try {
      const workers = this.workers();
      this.requireConsumers(workers);
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

  private async drain(): Promise<void> {
    if (this.server?.listening)
      await new Promise<void>((resolve, reject) =>
        this.server!.close((error) => (error ? reject(error) : resolve())),
      );
    // Drain during module destruction, before TypeORM closes on application shutdown.
    const results = await Promise.allSettled(
      this.workers().map((worker) => worker.close()),
    );
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length)
      throw new AggregateError(
        failures.map((result): unknown => result.reason),
        'Ingestion workers failed to close',
      );
  }
}
