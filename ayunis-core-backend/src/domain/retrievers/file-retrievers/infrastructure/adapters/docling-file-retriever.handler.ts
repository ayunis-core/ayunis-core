import axios from 'axios';
import FormData from 'form-data';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { FileRetrieverHandler } from '../../application/ports/file-retriever.handler';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from '../../domain/file-retriever-result.entity';
import {
  FileRetrievalFailedError,
  FileRetrieverUnexpectedError,
  FileTooLargeError,
  TooManyPagesError,
  ServiceBusyError,
  ServiceTimeoutError,
  FileRetrieverUnauthorizedError,
} from '../../application/file-retriever.errors';
import { File } from '../../domain/file.entity';
import { ConvertResponse } from 'src/common/clients/docling/generated/ayunisDocumentProcessing.schemas';
import retrievalConfig from 'src/config/retrieval.config';
import retryWithBackoff from 'src/common/util/retryWithBackoff';

@Injectable()
export class DoclingFileRetrieverHandler extends FileRetrieverHandler {
  private readonly logger = new Logger(DoclingFileRetrieverHandler.name);

  constructor(
    @Inject(retrievalConfig.KEY)
    private readonly config: ConfigType<typeof retrievalConfig>,
  ) {
    super();
  }

  async processFile(file: File): Promise<FileRetrieverResult> {
    try {
      this.logger.debug(
        `Processing file with Docling: ${file.filename} (${file.fileType})`,
      );

      // Make request with retry logic for 503 (server busy)
      // FormData must be created inside the retry function because streams can only be read once
      const response = await retryWithBackoff({
        fn: () => {
          const formData = new FormData();
          formData.append('file', file.fileData, {
            filename: file.filename,
            contentType: file.fileType,
          });

          return axios.post<ConvertResponse>(
            `${this.config.docling.serviceUrl}/convert/file`,
            formData,
            {
              headers: {
                ...formData.getHeaders(),
                ...(this.config.docling.apiKey && {
                  'X-API-Key': this.config.docling.apiKey,
                }),
              },
              timeout: 120000,
            },
          );
        },
        maxRetries: 3,
        delay: 1000,
        retryIfError: (error) => {
          if (axios.isAxiosError(error) && error.response?.status === 503) {
            this.logger.warn(
              `Docling service busy, retrying... (${file.filename})`,
            );
            return true;
          }
          return false;
        },
      });

      const result = response.data;

      this.logger.debug(
        `Docling conversion complete: ${result.filename} (${result.pages ?? 'unknown'} pages)`,
      );

      // Parse and return result
      return this.parseResponse(result);
    } catch (error) {
      this.logger.error(
        `Docling processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Re-throw known file retriever errors
      if (error instanceof FileRetrievalFailedError) {
        throw error;
      }

      // Handle HTTP errors with structured error classes
      const metadata = { provider: 'docling', filename: file.filename };

      // Extract status code from response or error message
      let status: number | undefined;
      if (axios.isAxiosError(error)) {
        status = error.response?.status;
        // Fallback: extract status from error message (e.g., "Request failed with status code 504")
        if (!status && error.message) {
          const match = error.message.match(/status code (\d+)/);
          if (match) {
            status = parseInt(match[1], 10);
          }
        }
      }

      if (status) {
        switch (status) {
          case 400:
            throw new FileRetrievalFailedError(
              'Bad request: missing filename or unsupported file extension',
              metadata,
            );
          case 401:
            throw new FileRetrieverUnauthorizedError(metadata);
          case 413:
            throw new FileTooLargeError(metadata);
          case 422:
            throw new TooManyPagesError(metadata);
          case 503:
            throw new ServiceBusyError(metadata);
          case 504:
            throw new ServiceTimeoutError(metadata);
          default:
            throw new FileRetrieverUnexpectedError(error as Error, metadata);
        }
      }

      throw new FileRetrieverUnexpectedError(error as Error, metadata);
    }
  }

  private parseResponse(result: ConvertResponse): FileRetrieverResult {
    const content = result.markdown;

    if (!content) {
      throw new FileRetrievalFailedError('Empty content from Docling', {
        provider: 'docling',
      });
    }

    // Return as single page with markdown content
    const pages = [new FileRetrieverPage(content, 1)];

    return new FileRetrieverResult(pages, {
      provider: 'docling',
      pageCount: result.pages,
    });
  }
}
