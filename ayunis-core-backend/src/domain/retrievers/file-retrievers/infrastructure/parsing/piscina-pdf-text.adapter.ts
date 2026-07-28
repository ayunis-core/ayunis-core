import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as path from 'path';
import Piscina from 'piscina';
import { PdfTextExtractorPort } from '../../application/ports/pdf-text-extractor.port';
import { FileRetrievalFailedError } from '../../application/file-retriever.errors';

const MAX_WORKER_THREADS = 2;
const WORKER_IDLE_TIMEOUT_MS = 30_000;
const EXTRACT_TIMEOUT_MS = 60_000;
// A hostile PDF can expand enormously while rendering. Capping the worker
// heap turns that into a failed task instead of a process-fatal V8 OOM.
const WORKER_MAX_OLD_GENERATION_SIZE_MB = 512;

/**
 * Runs local PDF work (page counting, text-layer extraction) in a piscina
 * worker-thread pool. pdf-parse is CPU-bound — on the event loop, a large
 * document would freeze every concurrent request for the duration.
 */
@Injectable()
export class PiscinaPdfTextAdapter
  extends PdfTextExtractorPort
  implements OnApplicationShutdown
{
  // Lazy so instantiating the adapter (e.g. in unit tests) never creates a
  // pool; idle workers shut down on their own after the idle timeout.
  private pool: Piscina | null = null;

  async countPages(buffer: Buffer): Promise<number> {
    return this.runTask<number>('countPages', buffer);
  }

  async extractPageTexts(buffer: Buffer): Promise<string[]> {
    return this.runTask<string[]>('extractPageTexts', buffer);
  }

  // The abort timeout terminates the running worker thread, so a hung parse
  // cannot occupy one of the pool's threads forever.
  private async runTask<T>(name: string, payload: unknown): Promise<T> {
    try {
      return (await this.getPool().run(payload, {
        name,
        signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
      })) as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new FileRetrievalFailedError(
          `Local PDF text extraction timed out after ${EXTRACT_TIMEOUT_MS / 1000} seconds`,
        );
      }
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool?.destroy();
    this.pool = null;
  }

  private getPool(): Piscina {
    this.pool ??= new Piscina({
      filename: path.join(__dirname, 'pdf-text.worker.js'),
      maxThreads: MAX_WORKER_THREADS,
      minThreads: 0,
      idleTimeout: WORKER_IDLE_TIMEOUT_MS,
      resourceLimits: {
        maxOldGenerationSizeMb: WORKER_MAX_OLD_GENERATION_SIZE_MB,
      },
    });
    return this.pool;
  }
}
