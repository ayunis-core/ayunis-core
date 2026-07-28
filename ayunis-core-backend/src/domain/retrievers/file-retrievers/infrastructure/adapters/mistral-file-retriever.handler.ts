import { Injectable, Logger } from '@nestjs/common';
import { FileRetrieverHandler } from '../../application/ports/file-retriever.handler';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from '../../domain/file-retriever-result.entity';
import {
  FileRetrievalFailedError,
  FileRetrieverError,
  FileRetrieverUnexpectedError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from '../../application/file-retriever.errors';
import type { ApplicationError } from 'src/common/errors/base.error';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { Mistral } from '@mistralai/mistralai';
import { OCRResponse } from '@mistralai/mistralai/models/components';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';
import { File } from '../../domain/file.entity';
import { OcrSession, PageOcrPort } from '../../application/ports/page-ocr.port';
import { ConfigService } from '@nestjs/config';

// A 404 from OCR right after a successful upload is files-API eventual
// consistency, not a missing file — retry it alongside the shared transient
// set. Other 4xx (e.g. too many pages) stay fatal.
function isTransientOcrError(error: Error): boolean {
  return (
    isTransientMistralError(error) ||
    (error instanceof MistralError && error.statusCode === 404)
  );
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof MistralError && error.statusCode === 404;
}

@Injectable()
export class MistralFileRetrieverHandler
  extends FileRetrieverHandler
  implements PageOcrPort
{
  private readonly logger = new Logger(MistralFileRetrieverHandler.name);
  private readonly client: Mistral;
  private readonly MODEL_NAME = 'mistral-ocr-latest';
  // Per-attempt timeout for the Mistral file APIs (upload, signed URL, OCR,
  // delete). Healthy OCR p95 is ~27s; the slowest successful calls observed
  // in production were ~115s, so 120s leaves headroom for large documents
  // while a stalled connection fails fast and retries instead of eating a
  // 5-minute slice per attempt (AYC-422).
  private readonly TIMEOUT_MS = 120 * 1000;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('retrieval.mistral.apiKey'),
      timeoutMs: this.TIMEOUT_MS,
    });
  }

  async processFile(file: File): Promise<FileRetrieverResult> {
    try {
      this.logger.debug(
        `Processing file with Mistral OCR: ${file.filename} (${file.fileType})`,
      );

      // Convert Buffer to Blob for Mistral API with the correct MIME type
      const blobPart: BlobPart = file.fileData as unknown as BlobPart;
      const fileBlob = new Blob([blobPart], { type: file.fileType });

      const ocrResponse = await this.ocrWithReuploadRecovery(fileBlob);

      return this.parseResponse(ocrResponse);
    } catch (error) {
      this.logger.error(
        `Mistral OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );

      throw this.mapProcessingError(error);
    }
  }

  private mapProcessingError(error: unknown): ApplicationError {
    const ctx = { provider: 'mistral', modelId: this.MODEL_NAME };

    const providerError = wrapProviderFailure(error, ctx);
    if (providerError) return providerError;

    if (error instanceof MistralError) {
      return this.mapMistralError(error, ctx);
    }

    return new FileRetrieverUnexpectedError(error as Error, {
      model: this.MODEL_NAME,
    });
  }

  /**
   * Page-scoped OCR: upload once, OCR arbitrary page subsets against the
   * same remote file, delete on close.
   */
  async openSession(file: File): Promise<OcrSession> {
    const blobPart: BlobPart = file.fileData as unknown as BlobPart;
    const fileBlob = new Blob([blobPart], { type: file.fileType });
    let uploadedFileId: string;
    try {
      uploadedFileId = await this.uploadFile(fileBlob);
    } catch (error) {
      throw this.toRetrieverError(error);
    }

    return {
      ocrPages: async (pageIndexes: number[]) => {
        try {
          const response = await this.runOcr(uploadedFileId, pageIndexes);
          return this.mapBatchPages(response, pageIndexes);
        } catch (error) {
          throw this.toRetrieverError(error);
        }
      },
      close: () => this.deleteFileBestEffort(uploadedFileId),
    };
  }

  private toRetrieverError(error: unknown): ApplicationError {
    if (error instanceof FileRetrieverError) {
      return error;
    }
    return this.mapProcessingError(error);
  }

  /**
   * Maps a batch response positionally onto the requested indexes: the API
   * returns the requested pages in request order, so this stays correct
   * whether `page.index` is absolute or batch-relative.
   */
  private mapBatchPages(
    response: OCRResponse,
    pageIndexes: number[],
  ): FileRetrieverPage[] {
    if (response.pages.length !== pageIndexes.length) {
      throw new FileRetrievalFailedError(
        `Mistral OCR returned ${response.pages.length} pages for a ${pageIndexes.length}-page batch`,
        { model: this.MODEL_NAME },
      );
    }
    return response.pages.map(
      (page, position) =>
        new FileRetrieverPage(page.markdown, pageIndexes[position] + 1),
    );
  }

  private mapMistralError(
    error: MistralError,
    ctx: { provider: string; modelId: string },
  ): ApplicationError {
    const metadata = { model: this.MODEL_NAME };

    // A rejection Mistral attributes to the document itself stays a document
    // error: the page cap is actionable for the user, and a corrupt file will
    // never succeed on retry — so neither may present as a provider outage.
    if (rejectsDocument(error, 'document_parser_too_many_pages')) {
      return new TooManyPagesError(metadata);
    }
    // Reached only after `ocrWithReuploadRecovery` has probed the file and, if
    // it had vanished, re-uploaded once — so a surviving 3310 is the document,
    // not the AYC-556 dedup race that shares this error type.
    if (rejectsDocument(error, 'invalid_request_file')) {
      return new UnprocessableDocumentError(error.message, metadata);
    }

    // Every other OCR 4xx is the provider choking on a machine-generated
    // request, not a bug in how we built it (AYC-538) — except auth failures,
    // which are our configuration's fault and must stay a distinct,
    // first-occurrence-alerting incident.
    if (isProviderRejection(error.statusCode)) {
      return new ProviderRequestRejectedError(
        { ...ctx, upstreamStatus: error.statusCode },
        error,
      );
    }

    return new FileRetrieverUnexpectedError(error, metadata);
  }

  private async uploadFile(fileBlob: Blob): Promise<string> {
    const uploaded = await retryWithBackoff({
      fn: () =>
        this.client.files.upload({
          file: fileBlob,
          purpose: 'ocr',
        }),
      maxRetries: 3,
      delay: 1000,
      retryIfError: isTransientMistralError,
    }).catch((error) => {
      this.logger.debug('File upload to Mistral failed', {
        error: error as Error,
      });
      this.logger.error('File upload to Mistral failed');
      throw error;
    });
    return uploaded.id;
  }

  /**
   * Uploads, runs OCR, and cleans up.
   *
   * Mistral deduplicates uploads by content signature, so two jobs processing
   * byte-identical documents are handed the same file id; whichever finishes
   * first deletes it, and the other's OCR call fails even though its own
   * upload succeeded (AYC-556). Re-uploading recovers, because once the id is
   * gone an upload of the same bytes yields a fresh, live one.
   *
   * The recoverable case is decided by asking the files API whether the file
   * still exists, not by matching the OCR error's text: `invalid_request_file`
   * / code 3310 also covers unrelated failures that re-uploading cannot fix,
   * and error wording is not a stable contract.
   */
  private async ocrWithReuploadRecovery(fileBlob: Blob): Promise<OCRResponse> {
    const fileId = await this.uploadFile(fileBlob);
    try {
      const response = await this.runOcr(fileId);
      await this.deleteFileBestEffort(fileId);
      return response;
    } catch (error) {
      // Probe before any cleanup — deleting first would make every failure
      // look like the vanished-file case.
      if (!(await this.uploadedFileIsGone(fileId))) {
        await this.deleteFileBestEffort(fileId);
        throw error;
      }
      this.logger.warn(
        'Uploaded file was removed before OCR ran; re-uploading once',
        { fileId },
      );
    }

    const freshFileId = await this.uploadFile(fileBlob);
    try {
      return await this.runOcr(freshFileId);
    } finally {
      await this.deleteFileBestEffort(freshFileId);
    }
  }

  /**
   * Distinguishes "the file we uploaded is gone" from any other OCR failure.
   * A retrieve of a deleted or never-existing id returns 404; a live one
   * returns 200. Treats an inconclusive answer as "still there" so an
   * unrelated failure is never retried as if the file had vanished.
   */
  private async uploadedFileIsGone(fileId: string): Promise<boolean> {
    try {
      await this.client.files.retrieve({ fileId });
      return false;
    } catch (error) {
      return isFileNotFound(error);
    }
  }

  /**
   * Runs OCR on the uploaded file by id, optionally scoped to specific
   * 0-based pages. Cleanup is the caller's job — it must not delete before
   * `ocrWithReuploadRecovery` has probed whether the file still exists.
   */
  private async runOcr(
    fileId: string,
    pageIndexes?: number[],
  ): Promise<OCRResponse> {
    return retryWithBackoff({
      fn: () =>
        this.client.ocr.process({
          model: this.MODEL_NAME,
          document: {
            type: 'file',
            fileId,
          },
          ...(pageIndexes ? { pages: pageIndexes } : {}),
          // The extracted images are never read — text only.
          includeImageBase64: false,
        }),
      maxRetries: 3,
      delay: 1000,
      retryIfError: isTransientOcrError,
    }).catch((error) => {
      this.logger.error(
        `Mistral OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      throw error;
    });
  }

  // Best-effort cleanup — don't fail the operation if the file was already
  // auto-deleted by Mistral (404) or is temporarily unreachable (5xx). The
  // OCR result is already obtained.
  private async deleteFileBestEffort(fileId: string): Promise<void> {
    await retryWithBackoff({
      fn: () => this.client.files.delete({ fileId }),
      maxRetries: 3,
      delay: 1000,
      retryIfError: isTransientMistralError,
    }).catch((error) => {
      this.logger.warn('Failed to delete file from Mistral (best-effort)', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  private parseResponse(response: OCRResponse): FileRetrieverResult {
    // Extract the text content from the response
    const pages = response.pages.map((p) => {
      return new FileRetrieverPage(p.markdown, p.index + 1);
    });

    if (pages.length === 0) {
      throw new FileRetrievalFailedError('Empty response from Mistral API', {
        model: this.MODEL_NAME,
        response,
      });
    }

    // Return the extracted text
    return new FileRetrieverResult(pages, {
      model: this.MODEL_NAME,
    });
  }
}

function rejectsDocument(error: MistralError, errorType: string): boolean {
  return typeof error.body === 'string' && error.body.includes(errorType);
}

function isProviderRejection(statusCode: number): boolean {
  return (
    statusCode >= 400 &&
    statusCode < 500 &&
    statusCode !== 401 &&
    statusCode !== 403
  );
}
