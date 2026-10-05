import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as path from 'path';
import Piscina from 'piscina';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { MsgParserPort } from 'src/domain/retrievers/file-retrievers/application/ports/msg-parser.port';
import type { MsgWorkerResult } from './msg.worker';

const MAX_WORKER_THREADS = 2;
const WORKER_IDLE_TIMEOUT_MS = 30_000;
const PARSE_TIMEOUT_MS = 30_000;
// A few KB of crafted CFBF (a cyclic sector chain, or a stream claiming a
// huge size) makes the parser allocate without bound. Capping the worker heap
// turns that into a failed task instead of a process-fatal V8 OOM.
const WORKER_MAX_OLD_GENERATION_SIZE_MB = 256;

/**
 * Parses untrusted .msg uploads in a piscina worker-thread pool, so a hostile
 * file can neither block the event loop nor crash the API process.
 */
@Injectable()
export class PiscinaMsgParserAdapter
  extends MsgParserPort
  implements OnApplicationShutdown
{
  private pool: Piscina | null = null;

  async extractText(fileData: Buffer): Promise<string> {
    const result = await this.run(fileData);
    if ('error' in result) {
      throw new UnprocessableDocumentError(
        'The Outlook message could not be read',
        { cause: result.error },
      );
    }
    return result.text;
  }

  // The abort timeout terminates the running worker thread, so a parse stuck
  // in a sector-chain loop cannot occupy one of the pool's threads forever.
  private async run(fileData: Buffer): Promise<MsgWorkerResult> {
    try {
      return (await this.getPool().run(fileData, {
        name: 'extractText',
        signal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
      })) as MsgWorkerResult;
    } catch (error: unknown) {
      if (isParseExhaustion(error)) {
        throw new UnprocessableDocumentError(
          'The Outlook message could not be read',
          { cause: error.name === 'AbortError' ? 'timeout' : 'out_of_memory' },
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
      filename: path.join(__dirname, 'msg.worker.js'),
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

function isParseExhaustion(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' ||
      (error as NodeJS.ErrnoException).code === 'ERR_WORKER_OUT_OF_MEMORY')
  );
}
