import PdfParse from 'pdf-parse';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { FileRetrieverHandler } from 'src/domain/retrievers/file-retrievers/application/ports/file-retriever.handler';
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

export class NpmPdfParseFileRetrieverHandler extends FileRetrieverHandler {
  async processFile(file: File): Promise<FileRetrieverResult> {
    try {
      const pdf = await PdfParse(file.fileData);
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
