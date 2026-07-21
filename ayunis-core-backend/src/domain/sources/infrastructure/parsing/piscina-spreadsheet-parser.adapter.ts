import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as path from 'path';
import Piscina from 'piscina';
import {
  ParsedSheet,
  SpreadsheetParserPort,
} from '../../application/ports/spreadsheet-parser.port';

const MAX_WORKER_THREADS = 2;
const WORKER_IDLE_TIMEOUT_MS = 30_000;

/**
 * Runs XLSX parsing in a piscina worker-thread pool. XLSX parsing is
 * CPU-bound — on the event loop, a large spreadsheet freezes every
 * concurrent request for the duration of the parse.
 */
@Injectable()
export class PiscinaSpreadsheetParserAdapter
  extends SpreadsheetParserPort
  implements OnApplicationShutdown
{
  // Lazy so instantiating the adapter (e.g. in unit tests) never creates a
  // pool; idle workers shut down on their own after the idle timeout.
  private pool: Piscina | null = null;

  async parse(buffer: Buffer): Promise<ParsedSheet[]> {
    return (await this.getPool().run(buffer)) as ParsedSheet[];
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool?.destroy();
    this.pool = null;
  }

  private getPool(): Piscina {
    this.pool ??= new Piscina({
      filename: path.join(__dirname, 'excel.worker.js'),
      maxThreads: MAX_WORKER_THREADS,
      minThreads: 0,
      idleTimeout: WORKER_IDLE_TIMEOUT_MS,
    });
    return this.pool;
  }
}
