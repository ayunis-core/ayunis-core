import {
  EXTRACTION_RESULT_SCHEMA_VERSION,
  type ExtractionResult,
  type ExtractionResultPage,
} from 'src/domain/sources/application/models/extraction-result';
import { DocumentExtractionResultInvalidError } from 'src/domain/sources/application/sources.errors';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(raw: Buffer | string): unknown {
  try {
    return JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
  } catch (error) {
    throw new DocumentExtractionResultInvalidError('not valid JSON', {
      cause: (error as Error).message,
    });
  }
}

function toPage(value: unknown, position: number): ExtractionResultPage {
  if (
    !isRecord(value) ||
    typeof value.index !== 'number' ||
    typeof value.text !== 'string'
  ) {
    throw new DocumentExtractionResultInvalidError(
      `page ${position} lacks index or text`,
    );
  }
  return {
    ...(value as unknown as ExtractionResultPage),
    // PostgreSQL rejects NUL; the service strips it, this keeps that a promise.
    text: value.text.replaceAll('\0', ''),
  };
}

/**
 * Validates the shape the consumer relies on and leaves the informational
 * fields as they came. An unknown schema version is a deployment mismatch,
 * not a document problem, so it fails as PROCESSING_FAILED.
 */
export function parseExtractionResult(raw: Buffer | string): ExtractionResult {
  const value = parseJson(raw);
  if (!isRecord(value)) {
    throw new DocumentExtractionResultInvalidError('not an object');
  }
  if (value.schemaVersion !== EXTRACTION_RESULT_SCHEMA_VERSION) {
    throw new DocumentExtractionResultInvalidError(
      `unsupported schemaVersion ${String(value.schemaVersion)}`,
    );
  }
  if (!Array.isArray(value.pages) || !isRecord(value.document)) {
    throw new DocumentExtractionResultInvalidError('pages or document missing');
  }
  const pages = value.pages
    .map(toPage)
    .sort((left, right) => left.index - right.index);
  return { ...(value as unknown as ExtractionResult), pages };
}

/** Today's join of OCR pages, kept byte-for-byte so chunk offsets stay stable. */
export function joinExtractionPages(pages: ExtractionResultPage[]): string {
  return pages.map((page) => page.text).join('\n');
}
