import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { promisify } from 'util';
import {
  PdfBatcherPort,
  type PdfBatch,
  type PdfBatchLimits,
  type PdfFileRef,
  type PdfSource,
} from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';
import {
  EmptyOcrResultError,
  PdfBatchTooLargeError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

const run = promisify(execFile);
const QPDF_TIMEOUT_MS = 120_000;
// qpdf exits 2 for an input it cannot use; --is-encrypted answers "no" with 2.
const QPDF_ERROR_EXIT = 2;

interface QpdfFailure {
  code?: number | string;
  killed?: boolean;
  stderr?: string;
}

/**
 * Splits PDFs with the qpdf command-line tool. The document stays on disk:
 * memory per batch is bounded by the batch byte limit, not by the file size,
 * which pdf-lib could not offer because it loads the whole document.
 */
@Injectable()
export class QpdfPdfBatcherAdapter extends PdfBatcherPort {
  private readonly maxDocumentPages: number;

  constructor(config: ConfigService) {
    super();
    this.maxDocumentPages = config.get<number>(
      'retrieval.processingMaxPdfPages',
      1000,
    );
    if (
      !Number.isSafeInteger(this.maxDocumentPages) ||
      this.maxDocumentPages < 1
    )
      throw new Error('Invalid PDF document page limit');
  }

  async pageCount(source: PdfSource): Promise<number> {
    if (!Buffer.isBuffer(source)) return this.countPages(source.path);
    const directory = await mkdtemp(join(tmpdir(), 'ayunis-pdf-'));
    try {
      const input = await this.onDisk(source, directory);
      return await this.countPages(input.path);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async *split(
    source: PdfSource,
    limits: PdfBatchLimits,
  ): AsyncIterable<PdfBatch> {
    this.validateLimits(limits);
    // Next to a staged file, so whoever staged it also owns removing the
    // batches when this process is stopped before it can.
    const parent = Buffer.isBuffer(source) ? tmpdir() : dirname(source.path);
    const directory = await mkdtemp(join(parent, 'ayunis-pdf-'));
    try {
      const input = await this.onDisk(source, directory);
      const total = await this.pagesToSend(input, limits);
      if (await this.fitsWhole(input, total, limits)) {
        const data = Buffer.isBuffer(source)
          ? source
          : await readFile(input.path);
        yield { data, startPage: 0, pageCount: total.send };
        return;
      }
      for (let start = 0; start < total.send;) {
        const batch = await this.fitBatch(input.path, directory, {
          start,
          total: total.send,
          limits,
        });
        yield batch;
        start += batch.pageCount;
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async onDisk(
    source: PdfSource,
    directory: string,
  ): Promise<PdfFileRef> {
    if (!Buffer.isBuffer(source)) return source;
    const path = join(directory, 'input.pdf');
    await writeFile(path, source, { mode: 0o600 });
    return { path, size: source.length };
  }

  private async pagesToSend(
    input: PdfFileRef,
    limits: PdfBatchLimits,
  ): Promise<{ document: number; send: number }> {
    const document = await this.countPages(input.path);
    if (document > this.maxDocumentPages)
      throw new TooManyPagesError({
        pageCount: document,
        maxPages: this.maxDocumentPages,
      });
    // Nothing to send: the OCR provider would answer an empty result for the
    // whole file, and an oversized empty file would otherwise yield no batch
    // at all and index as an empty, ready source.
    if (document === 0) throw new EmptyOcrResultError({ pageCount: document });
    return { document, send: Math.min(document, limits.pageLimit ?? Infinity) };
  }

  // A small document goes to OCR untouched. An encrypted one never does: its
  // pages are rewritten through qpdf, which hands OCR readable content.
  private async fitsWhole(
    input: PdfFileRef,
    total: { document: number; send: number },
    limits: PdfBatchLimits,
  ): Promise<boolean> {
    const withinLimits =
      total.send === total.document &&
      total.send <= limits.maxPages &&
      input.size <= limits.maxBytes;
    return withinLimits && !(await this.isEncrypted(input.path));
  }

  private async fitBatch(
    inputPath: string,
    directory: string,
    range: { start: number; total: number; limits: PdfBatchLimits },
  ): Promise<PdfBatch> {
    const { start, total, limits } = range;
    const output = join(directory, `batch-${start}.pdf`);
    let count = Math.min(limits.maxPages, total - start);
    for (;;) {
      await this.qpdf([
        '--warning-exit-0',
        '--empty',
        '--pages',
        inputPath,
        `${start + 1}-${start + count}`,
        '--',
        output,
      ]);
      const { size } = await stat(output);
      if (size <= limits.maxBytes) {
        const data = await readFile(output);
        await rm(output, { force: true });
        return { data, startPage: start, pageCount: count };
      }
      if (count === 1) throw new PdfBatchTooLargeError();
      count = Math.max(1, Math.floor(count / 2));
    }
  }

  private async countPages(path: string): Promise<number> {
    const output = await this.qpdf(['--warning-exit-0', '--show-npages', path]);
    const pages = Number.parseInt(output.trim(), 10);
    if (!Number.isSafeInteger(pages) || pages < 0)
      throw new UnprocessableDocumentError('The PDF could not be split safely');
    return pages;
  }

  private async isEncrypted(path: string): Promise<boolean> {
    try {
      await run('qpdf', ['--is-encrypted', path], this.options());
      return true;
    } catch (error) {
      if ((error as QpdfFailure).code === QPDF_ERROR_EXIT) return false;
      throw this.failure(error as QpdfFailure);
    }
  }

  private async qpdf(args: string[]): Promise<string> {
    try {
      const { stdout } = await run('qpdf', args, this.options());
      return stdout;
    } catch (error) {
      throw this.failure(error as QpdfFailure);
    }
  }

  // The environment is passed explicitly so the lookup of the binary follows
  // this process's PATH as it is now, not as it was at start.
  private options(): {
    timeout: number;
    maxBuffer: number;
    env: NodeJS.ProcessEnv;
  } {
    return {
      timeout: QPDF_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      env: process.env,
    };
  }

  // Only a document qpdf cannot read is the document's fault. A missing
  // binary or a timeout is ours and must fail loudly, not look like a bad PDF.
  private failure(error: QpdfFailure): Error {
    if (error.code === 'ENOENT')
      return new Error('qpdf is not installed; it is required to split PDFs');
    if (error.killed) return new Error('qpdf timed out while splitting a PDF');
    return new UnprocessableDocumentError(
      /password/i.test(error.stderr ?? '')
        ? 'The encrypted PDF could not be read'
        : 'The PDF could not be split safely',
    );
  }

  private validateLimits(limits: PdfBatchLimits): void {
    const values = [limits.maxPages, limits.maxBytes, limits.pageLimit ?? 1];
    if (values.some((value) => !Number.isSafeInteger(value) || value < 1)) {
      throw new Error('PDF batch limits must be positive integers');
    }
  }
}
