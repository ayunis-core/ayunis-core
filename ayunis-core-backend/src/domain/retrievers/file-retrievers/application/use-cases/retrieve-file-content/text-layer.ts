import { Logger } from '@nestjs/common';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import type { FileRetrieverRegistry } from 'src/domain/retrievers/file-retrievers/application/file-retriever-handler.registry';
import type { FileRetrieverProcessOptions } from 'src/domain/retrievers/file-retrievers/application/ports/file-retriever.handler';
import type { FileRetrieverResult } from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import type { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { FileRetrieverType } from 'src/domain/retrievers/file-retrievers/domain/value-objects/file-retriever-type.enum';

export type PdfProcessOptions = FileRetrieverProcessOptions & {
  allowLocalParsing?: boolean;
  textLayerFirst?: boolean;
};

// A page carrying only a page number, a stamp or a scanner's header line is
// not readable text; one blank page in a document (a cover, a back page) is
// no reason to OCR the rest.
const MIN_CHARACTERS_PER_PAGE = 20;
const MIN_SHARE_OF_PAGES_WITH_TEXT = 0.8;

const logger = new Logger('PdfTextLayer');

function hasText(text: string): boolean {
  return text.replace(/\s/g, '').length >= MIN_CHARACTERS_PER_PAGE;
}

/** Whether a PDF's text layer can stand in for OCR: most of its pages carry text. */
export function hasUsableTextLayer(result: FileRetrieverResult): boolean {
  const { pages } = result;
  if (pages.length === 0) return false;
  const withText = pages.filter((page) => hasText(page.text)).length;
  return withText / pages.length >= MIN_SHARE_OF_PAGES_WITH_TEXT;
}

function hasAnyText(result: FileRetrieverResult): boolean {
  return result.pages.some((page) => page.text.trim().length > 0);
}

/** The text layer page by page, `null` when the local parser cannot read the PDF. */
async function readTextLayer(
  registry: FileRetrieverRegistry,
  file: File,
): Promise<FileRetrieverResult | null> {
  try {
    return await registry
      .getHandler(FileRetrieverType.NPM_PDF_PARSE)
      .processFile(file, { splitPages: true });
  } catch (error) {
    logger.warn(
      { fileName: file.filename, err: error as Error },
      'Could not read the PDF text layer',
    );
    return null;
  }
}

/**
 * A PDF's text layer when it is usable (or nothing can OCR), else
 * `process` (OCR first). Should OCR reject the document, any text of the
 * layer is still better than none.
 */
export async function readTextLayerFirst(
  registry: FileRetrieverRegistry,
  file: File,
  canOcr: boolean,
  process: () => Promise<FileRetrieverResult>,
): Promise<FileRetrieverResult> {
  const textLayer = await readTextLayer(registry, file);
  if (textLayer && (hasUsableTextLayer(textLayer) || !canOcr)) return textLayer;
  try {
    return await process();
  } catch (error) {
    if (
      error instanceof UnprocessableDocumentError &&
      textLayer &&
      hasAnyText(textLayer)
    )
      return textLayer;
    throw error;
  }
}
