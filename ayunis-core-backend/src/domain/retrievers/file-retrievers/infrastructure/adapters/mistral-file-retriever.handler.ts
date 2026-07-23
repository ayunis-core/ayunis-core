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
  ServiceBusyError,
  ServiceTimeoutError,
  TooManyPagesError,
} from '../../application/file-retriever.errors';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { Mistral } from '@mistralai/mistralai';
import { OCRResponse } from '@mistralai/mistralai/models/components';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';
import { File } from '../../domain/file.entity';
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

      const uploadedFileId = await this.uploadFile(fileBlob);
      const ocrResponse = await this.runOcr(uploadedFileId);
      await this.deleteFileBestEffort(uploadedFileId);

      return this.parseResponse(ocrResponse);
    } catch (error) {
      this.logger.error(
        `Mistral OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );

      const metadata = { model: this.MODEL_NAME };

      if (error instanceof MistralError) {
        throw this.mapMistralError(error, metadata);
      }

      throw new FileRetrieverUnexpectedError(error as Error, metadata);
    }
  }

  private mapMistralError(
    error: MistralError,
    metadata: { model: string },
  ): FileRetrieverError {
    // 429 lands here only after the transient-error retries are exhausted —
    // persistent rate limiting is "busy, try again later", not a failed
    // retrieval.
    if (
      error.statusCode === 429 ||
      error.statusCode === 502 ||
      error.statusCode === 503
    ) {
      return new ServiceBusyError(metadata);
    }
    if (error.statusCode === 504) {
      return new ServiceTimeoutError(metadata);
    }
    if (
      typeof error.body === 'string' &&
      error.body.includes('document_parser_too_many_pages')
    ) {
      return new TooManyPagesError(metadata);
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return new FileRetrievalFailedError(error.message, metadata);
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

  /** Runs OCR on the uploaded file by id; deletes the uploaded file on failure. */
  private async runOcr(fileId: string): Promise<OCRResponse> {
    return retryWithBackoff({
      fn: () =>
        this.client.ocr.process({
          model: this.MODEL_NAME,
          document: {
            type: 'file',
            fileId,
          },
          includeImageBase64: true,
        }),
      maxRetries: 3,
      delay: 1000,
      retryIfError: isTransientOcrError,
    }).catch(async (error) => {
      this.logger.error(
        `Mistral OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      await this.client.files.delete({ fileId }).catch(() => undefined);
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
