import { Injectable, Logger } from '@nestjs/common';
import { FileRetrieverHandler } from '../../application/ports/file-retriever.handler';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from '../../domain/file-retriever-result.entity';
import {
  FileRetrievalFailedError,
  FileRetrieverUnexpectedError,
} from '../../application/file-retriever.errors';
import { Mistral } from '@mistralai/mistralai';
import { OCRResponse } from '@mistralai/mistralai/models/components';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { File } from '../../domain/file.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MistralFileRetrieverHandler extends FileRetrieverHandler {
  private readonly logger = new Logger(MistralFileRetrieverHandler.name);
  private readonly client: Mistral;
  private readonly MODEL_NAME = 'mistral-ocr-latest';

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('retrieval.mistral.apiKey'),
    });
  }

  async processFile(file: File): Promise<FileRetrieverResult> {
    try {
      this.logger.debug(
        `Processing file with Mistral OCR: ${file.filename} (${file.fileType})`,
      );

      // Convert Buffer to Blob for Mistral API with the correct MIME type
      const fileBlob = new Blob([file.fileData], { type: file.fileType });

      const uploaded_pdf = await retryWithBackoff({
        fn: () =>
          this.client.files.upload({
            file: fileBlob,
            purpose: 'ocr',
          }),
        maxRetries: 3,
        delay: 1000,
      }).catch((error) => {
        this.logger.debug('File upload to Mistral failed', {
          error: error as Error,
        });
        this.logger.error('File upload to Mistral failed');
        throw error;
      });

      const signedUrl = await retryWithBackoff({
        fn: () =>
          this.client.files.getSignedUrl({
            fileId: uploaded_pdf.id,
          }),
        maxRetries: 3,
        delay: 1000,
      }).catch(async (error) => {
        this.logger.error(
          `Mistral OCR signed URL retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : 'Unknown error',
        );
        await this.client.files.delete({
          fileId: uploaded_pdf.id,
        });
        throw error;
      });

      this.logger.debug('signed URL', { signedUrl });
      const ocrResponse = await retryWithBackoff({
        fn: () =>
          this.client.ocr.process({
            model: this.MODEL_NAME,
            document: {
              type: 'document_url',
              documentUrl: signedUrl.url,
            },
            includeImageBase64: true,
          }),
        maxRetries: 3,
        delay: 1000,
      }).catch(async (error) => {
        this.logger.error(
          `Mistral OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : 'Unknown error',
        );
        await this.client.files.delete({
          fileId: uploaded_pdf.id,
        });
        throw error;
      });

      await retryWithBackoff({
        fn: () =>
          this.client.files.delete({
            fileId: uploaded_pdf.id,
          }),
        maxRetries: 3,
        delay: 1000,
      });

      // Parse the response
      return this.parseResponse(ocrResponse);
    } catch (error) {
      this.logger.error(
        `Mistral OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      throw new FileRetrieverUnexpectedError(error as Error, {
        model: this.MODEL_NAME,
      });
    }
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
