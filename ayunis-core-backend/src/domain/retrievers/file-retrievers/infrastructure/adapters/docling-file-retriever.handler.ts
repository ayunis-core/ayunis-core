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
} from '../../application/file-retriever.errors';
import { File } from '../../domain/file.entity';
import { ConvertResponse } from 'src/common/clients/docling/generated/ayunisDocumentProcessing.schemas';
import retrievalConfig from 'src/config/retrieval.config';

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

      // Use form-data package for proper multipart handling in Node.js
      const formData = new FormData();
      formData.append('file', file.fileData, {
        filename: file.filename,
        contentType: file.fileType,
      });

      // Make request with fresh axios (no default headers interfering)
      const response = await axios.post<ConvertResponse>(
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
      this.logger.debug(`Result of docling parsing: ${response.data.markdown}`);

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

      if (error instanceof FileRetrievalFailedError) {
        throw error;
      }

      throw new FileRetrieverUnexpectedError(error as Error, {
        provider: 'docling',
      });
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
