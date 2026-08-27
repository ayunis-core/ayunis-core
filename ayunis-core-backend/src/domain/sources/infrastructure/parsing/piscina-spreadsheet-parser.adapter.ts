import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import * as path from 'path';
import Piscina from 'piscina';
import {
  ParsedCsvData,
  ParsedSheet,
  SpreadsheetParserPort,
} from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import {
  SpreadsheetParseTimeoutError,
  UnprocessableSpreadsheetError,
} from 'src/domain/sources/application/sources.errors';

const MAX_WORKER_THREADS = 2;
const WORKER_IDLE_TIMEOUT_MS = 30_000;
const PARSE_TIMEOUT_MS = 60_000;
// XLSX is zip-compressed, so a 25 MB upload can decompress to hundreds of MB
// of cells. Capping the worker heap turns a decompression bomb into a failed
// task (ERR_WORKER_OUT_OF_MEMORY) instead of a process-fatal V8 OOM.
const WORKER_MAX_OLD_GENERATION_SIZE_MB = 512;

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

  async parseWorkbook(buffer: Buffer): Promise<ParsedSheet[]> {
    return this.runTask<ParsedSheet[]>('parseWorkbook', buffer);
  }

  async listDataSheets(buffer: Buffer): Promise<string[]> {
    return this.runTask<string[]>('listDataSheets', buffer);
  }

  async parseCsv(text: string): Promise<ParsedCsvData> {
    return this.runTask<ParsedCsvData>('parseCsv', text);
  }

  // The abort timeout terminates the running worker thread, so a hung parse
  // cannot occupy one of the pool's threads forever.
  private async runTask<T>(name: string, payload: unknown): Promise<T> {
    try {
      return (await this.getPool().run(payload, {
        name,
        signal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
      })) as T;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SpreadsheetParseTimeoutError(PARSE_TIMEOUT_MS);
      }
      const malformedWorkbook = classifyMalformedWorkbookError(error);
      if (malformedWorkbook) {
        throw new UnprocessableSpreadsheetError(malformedWorkbook.cause, {
          parserReason: malformedWorkbook.reason,
        });
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
      filename: path.join(__dirname, 'excel.worker.js'),
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

const MALFORMED_WORKBOOK_RULES = [
  {
    reason: 'encrypted_workbook',
    pattern: /encrypted|password.?protected/i,
  },
  {
    reason: 'unsupported_archive',
    pattern: /unsupported zip/i,
  },
  {
    reason: 'archive_size_mismatch',
    pattern: /bad (?:compressed|uncompressed) size/i,
  },
  {
    reason: 'invalid_container',
    pattern: /invalid (?:zip|cfb|workbook)|unrecognized cfb header/i,
  },
  {
    reason: 'missing_workbook_part',
    pattern: /(?:cannot|could not) find (?:file .* in zip|.*workbook)/i,
  },
  {
    reason: 'truncated_data',
    pattern: /end of data/i,
  },
  {
    reason: 'corrupt_workbook',
    pattern: /corrupt/i,
  },
] as const;

type MalformedWorkbookReason =
  (typeof MALFORMED_WORKBOOK_RULES)[number]['reason'];

interface MalformedWorkbookFailure {
  cause: Error;
  reason: MalformedWorkbookReason;
}

function classifyMalformedWorkbookError(
  error: unknown,
): MalformedWorkbookFailure | null {
  if (!(error instanceof Error)) return null;

  const matchingRule = MALFORMED_WORKBOOK_RULES.find(({ pattern }) =>
    pattern.test(error.message),
  );
  return matchingRule ? { cause: error, reason: matchingRule.reason } : null;
}
