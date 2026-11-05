import type { Provider } from '@nestjs/common';
import { ingestionInApi } from 'src/config/ingestion.config';

/**
 * Which process works through the ingestion queues. Not injectable: queue
 * modules pick their consumers while they are imported, before the DI
 * container exists, so the worker entry point declares itself on the shared
 * instance before it loads the module graph.
 */
export class IngestionTopology {
  private worker = false;

  constructor(
    private readonly env: () => NodeJS.ProcessEnv = () => process.env,
  ) {}

  declareWorker(): void {
    this.worker = true;
  }

  get isWorker(): boolean {
    return this.worker;
  }

  get consumesQueues(): boolean {
    return this.worker || ingestionInApi(this.env());
  }

  consumers<T extends Provider>(consumers: T[]): T[] {
    return this.consumesQueues ? consumers : [];
  }
}

export const ingestionTopology = new IngestionTopology();
