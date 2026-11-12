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
import {
  extractProviderErrorDiagnostics,
  extractProviderExplanation,
} from 'src/common/errors/extract-provider-error-diagnostics.helper';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { Mistral } from '@mistralai/mistralai';
import { OCRResponse } from '@mistralai/mistralai/models/components';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { isTransientMistralError } from 'src/common/util/mistral-transient-error';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MistralFileRetrieverHandler extends FileRetrieverHandler {
  private readonly logger = new Logger(MistralFileRetrieverHandler.name);

  private readonly client: Mistral;
  private readonly MODEL_NAME = 'mistral-ocr-latest';
  // Per-attempt OCR timeout. Healthy OCR p95 is ~27s, but successful calls of
  // ~115s were observed in production, and one batch of 20 picture pages
  // answered correctly after 105s (2026-11-12), so 120s stays. Cutting it to
  // 60s was considered and dropped: there are no production timings per
  // batch to show that it would not fail slow but successful calls.
  // What bounds a stalled provider is the retry window instead. Failures are
  // retried only while the batch is younger than RETRY_WINDOW_MS: quick ones
  // (429, 5xx) keep their three retries, a timed-out attempt gets one more
  // and a second timeout ends the batch. That is about four minutes per
  // batch at worst, after which the queue's own retry takes over with the
  // finished batches saved; three retries of a timeout held a document slot
  // for over eight minutes (AYC-1800).
  private readonly TIMEOUT_MS = 120 * 1000;
  private readonly RETRY_WINDOW_MS = this.TIMEOUT_MS + 5 * 1000;
  private readonly imageText: boolean;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('retrieval.mistral.apiKey'),
      server: 'eu',
      serverURL: this.configService.get('retrieval.mistral.serverUrl'),
      timeoutMs: this.TIMEOUT_MS,
    });
    this.imageText =
      this.configService.get<boolean>('retrieval.ocrImageText') !== false;
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

      const ocrResponse = await this.runOcr(file, options?.pageLimit);

      return this.parseResponse(ocrResponse);
    } catch (error) {
      this.logger.error(
        { err: error as Error, ...ocrFailureDiagnostics(error) },
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
    // Mistral's 3310 and 3740 responses and all semantic 422 responses mean
    // OCR rejected the document; their body shapes are not a stable API
    // contract.
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

  // The EU endpoint has no Files API, so the document travels inline.
  private async runOcr(file: File, pageLimit?: number): Promise<OCRResponse> {
    const documentUrl = `data:${file.fileType};base64,${file.fileData.toString('base64')}`;
    const startedAt = Date.now();
    return retryWithBackoff({
      fn: () =>
        this.client.ocr.process({
          model: this.MODEL_NAME,
          document: { type: 'document_url', documentUrl },
          // Text annotations do not require the image bytes; returning those
          // bytes pushed large documents into the 120s body-read deadline
          // (AYC-655).
          includeImageBase64: false,
          ...(this.imageText
            ? { bboxAnnotationFormat: IMAGE_TEXT_ANNOTATION_FORMAT }
            : {}),
          ...(pageLimit === undefined ? {} : { pages: `0-${pageLimit - 1}` }),
        }),
      maxRetries: 3,
      delay: 1000,
      retryIfError: (error) =>
        Date.now() - startedAt < this.RETRY_WINDOW_MS &&
        isTransientMistralError(error),
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

const SAFE_BODY_SCALAR = /^[\w.-]{1,64}$/;

// The error body's `type` and `code` tell OCR rejections apart; the file
// itself never travels in them, unlike the free-text message, which is
// redacted before it is logged.
function ocrFailureDiagnostics(error: unknown): Record<string, unknown> {
  if (!(error instanceof MistralError)) return {};
  const body = parseErrorBody(error);
  const diagnostics: Record<string, unknown> = {
    ...extractProviderErrorDiagnostics(error),
    upstreamType: safeBodyScalar(body?.type),
    upstreamCode: safeBodyScalar(body?.code),
    upstreamMessage: extractProviderExplanation(error),
  };
  return Object.fromEntries(
    Object.entries(diagnostics).filter(([, value]) => value !== undefined),
  );
}

function safeBodyScalar(value: unknown): string | undefined {
  const text = typeof value === 'number' ? String(value) : value;
  return typeof text === 'string' && SAFE_BODY_SCALAR.test(text)
    ? text
    : undefined;
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
