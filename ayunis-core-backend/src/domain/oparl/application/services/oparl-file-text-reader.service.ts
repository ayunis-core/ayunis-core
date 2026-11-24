import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  detectFileType,
  getCanonicalMimeType,
  FILE_EXTENSIONS,
  MIME_TYPES,
  type DetectedFileType,
} from 'src/common/util/file-type';
import { MAX_SOURCE_FILE_SIZE_BYTES } from 'src/common/util/source-file-upload';
import {
  InvalidFileTypeError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { PreflightCheckCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.command';
import { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import {
  OparlFileSkipReason,
  OparlFileTextStatus,
} from 'src/domain/oparl/domain/oparl-file-text';
import type {
  OparlFileText,
  OparlPendingFile,
} from 'src/domain/oparl/application/models/oparl-document';
import {
  OparlClientPort,
  type OparlDownload,
} from 'src/domain/oparl/application/ports/oparl-client.port';
import { OparlFileTooLargeError } from 'src/domain/oparl/application/oparl.errors';

/** `unchanged`: the bytes are the ones read before, nothing to extract. */
export type OparlFileReadResult = OparlFileText | 'unchanged';

// Audio, spreadsheets and emails are left out: transcription costs, and
// they are rarely what a council publishes.
const EXTENSIONS: Partial<Record<DetectedFileType, string>> = {
  pdf: FILE_EXTENSIONS.PDF,
  txt: FILE_EXTENSIONS.TXT,
  html: FILE_EXTENSIONS.HTML,
  docx: FILE_EXTENSIONS.DOCX,
  pptx: FILE_EXTENSIONS.PPTX,
  odt: FILE_EXTENSIONS.ODT,
  odp: FILE_EXTENSIONS.ODP,
};

function isSupported(type: DetectedFileType): boolean {
  return EXTENSIONS[type] !== undefined;
}

/**
 * A name the retriever types as `type` whatever the RIS called the file:
 * it types text by extension only.
 */
function retrievalName(fileName: string, type: DetectedFileType): string {
  return detectFileType('', fileName) === type
    ? fileName
    : `${fileName}${EXTENSIONS[type] ?? ''}`;
}

function normalizedMime(mimeType: string | null): string {
  return (mimeType ?? '').split(';')[0].trim().toLowerCase();
}

// detectFileType leaves text/plain to the extension (it is too broad for
// uploads); a RIS that says text/plain means a text file.
function typeOf(mimeType: string | null, fileName: string): DetectedFileType {
  const mime = normalizedMime(mimeType);
  const type = detectFileType(mime, fileName);
  return type === 'unknown' && mime === MIME_TYPES.TXT ? 'txt' : type;
}

function fileNameOf(file: OparlPendingFile, url: string): string {
  if (file.fileName) return file.fileName;
  let last: string;
  try {
    last = new URL(url).pathname.split('/').pop() ?? '';
    last = decodeURIComponent(last);
  } catch {
    last = '';
  }
  return last || 'file';
}

function skipped(
  reason: OparlFileSkipReason,
  contentHash: string | null = null,
  error: string | null = null,
): OparlFileText {
  return { status: OparlFileTextStatus.SKIPPED, reason, contentHash, error };
}

/** What the metadata alone says is not to be downloaded. */
function skipByMetadata(
  file: OparlPendingFile,
  fileName: string,
): OparlFileText | null {
  if (file.size !== null && file.size > MAX_SOURCE_FILE_SIZE_BYTES)
    return skipped(OparlFileSkipReason.TOO_LARGE);
  const type = typeOf(file.mimeType, fileName);
  if (type !== 'unknown' && !isSupported(type))
    return skipped(OparlFileSkipReason.UNSUPPORTED_TYPE);
  return null;
}

/**
 * Downloads a mirrored file and extracts its text, the text layer first and
 * OCR only without one, under the upload limits (size, pages). Remote and
 * provider failures are results (`failed`), not errors; an abort is thrown.
 * Platform work: no org is charged.
 */
@Injectable()
export class OparlFileTextReader {
  private readonly logger = new Logger(OparlFileTextReader.name);

  constructor(
    private readonly client: OparlClientPort,
    private readonly retrieveFileContent: RetrieveFileContentUseCase,
    private readonly preflightCheck: PreflightCheckUseCase,
  ) {}

  async read(
    file: OparlPendingFile,
    signal: AbortSignal,
  ): Promise<OparlFileReadResult> {
    const url = file.accessUrl ?? file.downloadUrl;
    if (!url) return skipped(OparlFileSkipReason.UNREADABLE, null, 'No URL');
    const fileName = fileNameOf(file, url);
    const skip = skipByMetadata(file, fileName);
    if (skip) return skip;

    let download: OparlDownload;
    try {
      download = await this.client.downloadFile(url, {
        maxBytes: MAX_SOURCE_FILE_SIZE_BYTES,
        signal,
      });
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof OparlFileTooLargeError)
        return skipped(OparlFileSkipReason.TOO_LARGE);
      return this.failed(file, error);
    }
    const contentHash = createHash('sha256')
      .update(download.data)
      .digest('hex');
    if (
      file.previous?.status === OparlFileTextStatus.EXTRACTED &&
      file.previous.contentHash === contentHash
    )
      return 'unchanged';
    return this.extract(file, fileName, download, contentHash, signal);
  }

  private async extract(
    file: OparlPendingFile,
    fileName: string,
    download: OparlDownload,
    contentHash: string,
    signal: AbortSignal,
  ): Promise<OparlFileText> {
    const metadataType = typeOf(file.mimeType, fileName);
    const type =
      metadataType === 'unknown'
        ? typeOf(download.contentType, fileName)
        : metadataType;
    if (!isSupported(type))
      return skipped(OparlFileSkipReason.UNSUPPORTED_TYPE, contentHash);
    const fileType =
      getCanonicalMimeType(type) ??
      normalizedMime(file.mimeType ?? download.contentType);
    const name = retrievalName(fileName, type);
    try {
      if (type === 'pdf')
        await this.preflightCheck.execute(
          new PreflightCheckCommand({
            fileData: download.data,
            fileName: name,
            fileType,
          }),
        );
      const result = await this.retrieveFileContent.execute(
        new RetrieveFileContentCommand({
          fileData: download.data,
          fileName: name,
          fileType,
          pdfTextLayerFirst: true,
          onBehalfOfPlatform: true,
        }),
      );
      const pages = result.pages.map(({ number, text }) => ({ number, text }));
      if (!pages.some((page) => page.text.trim().length > 0))
        return skipped(OparlFileSkipReason.UNREADABLE, contentHash, 'No text');
      return { status: OparlFileTextStatus.EXTRACTED, contentHash, pages };
    } catch (error) {
      signal.throwIfAborted();
      return this.extractionFailure(file, error, contentHash);
    }
  }

  private extractionFailure(
    file: OparlPendingFile,
    error: unknown,
    contentHash: string,
  ): OparlFileText {
    if (error instanceof TooManyPagesError)
      return skipped(OparlFileSkipReason.TOO_MANY_PAGES, contentHash);
    if (error instanceof InvalidFileTypeError)
      return skipped(OparlFileSkipReason.UNSUPPORTED_TYPE, contentHash);
    if (error instanceof UnprocessableDocumentError)
      return skipped(
        OparlFileSkipReason.UNREADABLE,
        contentHash,
        error.message,
      );
    return this.failed(file, error);
  }

  private failed(file: OparlPendingFile, error: unknown): OparlFileText {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      { fileId: file.id, err: error as Error },
      'Could not read an OParl file',
    );
    return { status: OparlFileTextStatus.FAILED, error: message };
  }
}
