import { Injectable, Logger } from '@nestjs/common';
import {
  FileRetrieverHandler,
  type FileRetrieverProcessOptions,
} from 'src/domain/retrievers/file-retrievers/application/ports/file-retriever.handler';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import {
  EmptyOcrResultError,
  FileRetrieverUnexpectedError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { Mistral } from '@mistralai/mistralai';
import { OCRResponse } from '@mistralai/mistralai/models/components';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
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
export class MistralFileRetrieverHandler extends FileRetrieverHandler {
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
      serverURL: this.configService.get('retrieval.mistral.serverUrl'),
      timeoutMs: this.TIMEOUT_MS,
    });
  }

  async processFile(
    file: File,
    options?: FileRetrieverProcessOptions,
  ): Promise<FileRetrieverResult> {
    try {
      this.logger.debug(
        { fileName: file.filename, fileType: file.fileType },
        'Processing file with Mistral OCR',
      );

      // Convert Buffer to Blob for Mistral API with the correct MIME type
      const blobPart: BlobPart = file.fileData as unknown as BlobPart;
      const fileBlob = new Blob([blobPart], { type: file.fileType });

      const ocrResponse = await this.ocrWithReuploadRecovery(
        fileBlob,
        options?.pageLimit,
      );

      return this.parseResponse(ocrResponse);
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Mistral OCR processing failed',
      );

      throw this.mapProcessingError(error);
    }
  }

  private mapProcessingError(error: unknown): ApplicationError {
    // Already-classified errors (the zero-page document error, anything a
    // future refactor throws inside processFile) must pass through — without
    // this guard they were re-wrapped as FileRetrieverUnexpectedError and
    // alerted as UNEXPECTED_ERROR (AYC-655).
    if (error instanceof ApplicationError) return error;

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
    // not the AYC-556 dedup race that shares this error type. Mistral's 3740
    // response and all semantic 422 responses likewise mean OCR rejected the
    // uploaded document; their body shapes are not a stable API contract.
    if (
      rejectsDocument(error, 'invalid_request_file') ||
      rejectsDocument(error, 'document_parser_invalid_file') ||
      error.statusCode === 422
    ) {
      return new UnprocessableDocumentError(
        'The document could not be processed',
        metadata,
      );
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
      this.logger.debug(
        { err: error as Error },
        'File upload to Mistral failed',
      );
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
  private async ocrWithReuploadRecovery(
    fileBlob: Blob,
    pageLimit?: number,
  ): Promise<OCRResponse> {
    const fileId = await this.uploadFile(fileBlob);
    try {
      const response = await this.runOcr(fileId, pageLimit);
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
        { fileId },
        'Uploaded file was removed before OCR ran; re-uploading once',
      );
    }

    const freshFileId = await this.uploadFile(fileBlob);
    try {
      return await this.runOcr(freshFileId, pageLimit);
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
   * Runs OCR on the uploaded file by id. Cleanup is the caller's job — it must
   * not delete before `ocrWithReuploadRecovery` has probed whether the file
   * still exists.
   */
  private async runOcr(
    fileId: string,
    pageLimit?: number,
  ): Promise<OCRResponse> {
    return retryWithBackoff({
      fn: () =>
        this.client.ocr.process({
          model: this.MODEL_NAME,
          document: {
            type: 'file',
            fileId,
          },
          // Text annotations do not require the image bytes; returning those
          // bytes pushed large documents into the 120s body-read deadline
          // (AYC-655).
          includeImageBase64: false,
          bboxAnnotationFormat: IMAGE_TEXT_ANNOTATION_FORMAT,
          ...(pageLimit === undefined ? {} : { pages: `0-${pageLimit - 1}` }),
        }),
      maxRetries: 3,
      delay: 1000,
      retryIfError: isTransientOcrError,
    }).catch((error) => {
      this.logger.error(
        { err: error as Error },
        'Mistral OCR processing failed',
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
      this.logger.warn(
        { fileId, err: error as Error },
        'Failed to delete file from Mistral (best-effort)',
      );
    });
  }

  private parseResponse(response: OCRResponse): FileRetrieverResult {
    // Extract the text content from the response
    const pages = response.pages.map((page) => {
      const imageText = extractImageTextAnnotations(page.images);
      const text = [page.markdown, ...imageText]
        .filter((part) => part.trim().length > 0)
        .join('\n\n');
      return new FileRetrieverPage(text, page.index + 1);
    });

    if (pages.length === 0) {
      // This subtype lets the use case attempt local PDF parsing while keeping
      // the same terminal 422 classification if the fallback also finds no text.
      throw new EmptyOcrResultError({
        model: this.MODEL_NAME,
        pageCount: 0,
      });
    }

    // Return the extracted text
    return new FileRetrieverResult(pages, {
      model: this.MODEL_NAME,
    });
  }
}

const IMAGE_TEXT_ANNOTATION_FORMAT = {
  type: 'json_schema' as const,
  jsonSchema: {
    name: 'image_text',
    description: 'Extract text visible inside an image embedded in a document',
    schemaDefinition: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description:
            'A verbatim transcription of all visible text in reading order',
        },
      },
      required: ['text'],
      additionalProperties: false,
    },
    strict: true,
  },
};

function extractImageTextAnnotations(
  images: Array<{ imageAnnotation?: string | null }> | undefined,
): string[] {
  return (images ?? [])
    .map((image) => parseImageTextAnnotation(image.imageAnnotation))
    .filter((text): text is string => text !== undefined);
}

function parseImageTextAnnotation(
  annotation?: string | null,
): string | undefined {
  if (!annotation) return undefined;
  try {
    const parsed: unknown = JSON.parse(annotation);
    if (typeof parsed !== 'object' || parsed === null || !('text' in parsed)) {
      return undefined;
    }
    const text = (parsed as { text?: unknown }).text;
    return typeof text === 'string' && text.trim().length > 0
      ? text.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

function rejectsDocument(error: MistralError, errorType: string): boolean {
  if (error.statusCode !== 400) return false;
  return parseErrorBody(error)?.type === errorType;
}

function parseErrorBody(
  error: MistralError,
): Record<string, unknown> | undefined {
  try {
    const body: unknown = JSON.parse(error.body);
    return typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function isProviderRejection(statusCode: number): boolean {
  return (
    statusCode >= 400 &&
    statusCode < 500 &&
    statusCode !== 401 &&
    statusCode !== 403
  );
}
