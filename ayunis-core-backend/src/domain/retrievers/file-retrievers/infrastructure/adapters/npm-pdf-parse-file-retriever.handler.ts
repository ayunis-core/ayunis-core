import PdfParse from 'pdf-parse';
import { PDFJS, PDFWorker } from 'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js';
import { readFile } from 'fs/promises';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  FileRetrieverHandler,
  type FileRetrieverProcessOptions,
} from 'src/domain/retrievers/file-retrievers/application/ports/file-retriever.handler';
import { FileRetrieverPage } from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import { FileRetrieverResult } from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import type { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';

const PDFJS_DOCUMENT_ERROR_NAMES = [
  'FormatError',
  'InvalidPDFException',
  'MissingPDFException',
  'PasswordException',
] as const;
type PdfJsDocumentErrorName = (typeof PDFJS_DOCUMENT_ERROR_NAMES)[number];
const PDFJS_DOCUMENT_ERRORS = new Set<string>(PDFJS_DOCUMENT_ERROR_NAMES);

const CORRUPT_PDF_MESSAGE_RULES = [
  {
    reason: 'invalid_flate_stream',
    pattern: /bad block header in flate stream/i,
  },
] as const;
type CorruptPdfReason = (typeof CORRUPT_PDF_MESSAGE_RULES)[number]['reason'];

interface MalformedPdfFailure {
  parserError: string;
  reason: 'pdfjs_document_error' | CorruptPdfReason;
}

// pdf-parse's default PDF.js build; pdf-parse loads the same module.
const PDFJS_BUILD = 'v1.10.100';

type ParsePdf = (
  data: Uint8Array | PdfSource,
  options?: PdfParse.Options,
) => Promise<PdfParse.Result>;

/** pdf-parse passes its input to PDF.js `getDocument` as is. */
interface PdfSource {
  data: Uint8Array;
  worker: PDFWorker;
}

// PDF.js logs every warning with console.log, which goes to stdout and from
// there to the log pipeline: one damaged font can print tens of thousands of
// lines. Errors still throw.
PDFJS.verbosity = PDFJS.VERBOSITY_LEVELS.errors;

/**
 * A PDF.js worker (in-process in Node) that logs errors only. The worker
 * keeps its own log level, which only a `configure` message sets; the
 * message arrives before the document it is sent ahead of.
 */
async function createQuietWorker(): Promise<PDFWorker> {
  const worker = new PDFWorker();
  await worker.promise;
  worker.messageHandler.send('configure', {
    verbosity: PDFJS.VERBOSITY_LEVELS.errors,
  });
  return worker;
}

async function parsePdf(
  bytes: Uint8Array,
  options: PdfParse.Options = {},
): Promise<PdfParse.Result> {
  // PDF.js expects copying Uint8Array.slice(), not Buffer.slice() views.
  // pdf-parse forwards typed arrays, but its declarations only allow Buffer.
  const parse = PdfParse as ParsePdf;
  const worker = await createQuietWorker();
  try {
    return await parse(
      { data: bytes, worker },
      { ...options, version: PDFJS_BUILD },
    );
  } finally {
    worker.destroy();
  }
}

interface PdfPageProxy {
  pageIndex: number;
  getTextContent(options: object): Promise<{
    items: Array<{ str: string; transform: number[] }>;
  }>;
}

// pdf-parse's own page rendering: items on one baseline joined, a line
// break wherever the baseline changes.
async function renderPage(page: PdfPageProxy): Promise<string> {
  const content = await page.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });
  let lastY: number | undefined;
  let text = '';
  for (const item of content.items) {
    const y = item.transform[5];
    text += lastY === undefined || lastY === y ? item.str : `\n${item.str}`;
    lastY = y;
  }
  return text;
}

export class NpmPdfParseFileRetrieverHandler extends FileRetrieverHandler {
  async processFile(
    file: File,
    options?: FileRetrieverProcessOptions,
  ): Promise<FileRetrieverResult> {
    try {
      // The local parser needs the whole document; a file kept on disk is
      // read only here, when OCR is unavailable or could not use it.
      const data = file.local ? await readFile(file.local.path) : file.fileData;
      if (options?.splitPages) return await this.readPages(data);
      const pdf = await parsePdf(new Uint8Array(data));
      return new FileRetrieverResult([new FileRetrieverPage(pdf.text, 1)]);
    } catch (error) {
      const failure = classifyMalformedPdfError(error);
      if (failure) {
        throw new UnprocessableDocumentError(
          'The PDF is malformed or cannot be read.',
          {
            fileName: file.filename,
            parserError: failure.parserError,
            parserReason: failure.reason,
          },
        );
      }
      throw error;
    }
  }

  private async readPages(data: Buffer): Promise<FileRetrieverResult> {
    const texts = new Map<number, string>();
    const pdf = await parsePdf(new Uint8Array(data), {
      pagerender: async (page: PdfPageProxy) => {
        const text = await renderPage(page);
        texts.set(page.pageIndex + 1, text);
        return text;
      },
    });
    // A page pdf-parse could not render stays, without text.
    const pages = Array.from(
      { length: pdf.numpages },
      (_, index) =>
        new FileRetrieverPage(texts.get(index + 1) ?? '', index + 1),
    );
    return new FileRetrieverResult(pages);
  }
}

function classifyMalformedPdfError(error: unknown): MalformedPdfFailure | null {
  if (!(error instanceof Error)) return null;

  const pdfJsErrorName = findPdfJsDocumentErrorName(error);
  if (pdfJsErrorName) {
    return {
      parserError: pdfJsErrorName,
      reason: 'pdfjs_document_error',
    };
  }

  const matchingRule = CORRUPT_PDF_MESSAGE_RULES.find(({ pattern }) =>
    pattern.test(error.message),
  );
  return matchingRule
    ? { parserError: error.name, reason: matchingRule.reason }
    : null;
}

function findPdfJsDocumentErrorName(
  error: Error,
): PdfJsDocumentErrorName | undefined {
  return [error.name, extractErrorNamePrefix(error.message)].find(
    isPdfJsDocumentErrorName,
  );
}

function extractErrorNamePrefix(message: string): string | undefined {
  return /^(?<errorName>[^:]+):/.exec(message)?.groups?.errorName.trim();
}

function isPdfJsDocumentErrorName(
  value: string | undefined,
): value is PdfJsDocumentErrorName {
  return value !== undefined && PDFJS_DOCUMENT_ERRORS.has(value);
}
