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
import { File } from '../../domain/file.entity';
import { getDoclingDocumentProcessingAPI } from 'src/common/clients/docling/generated/doclingDocumentProcessingAPI';
import {
  ConversionResult,
  TaskStatus,
} from 'src/common/clients/docling/generated/doclingDocumentProcessingAPI.schemas';

@Injectable()
export class DoclingFileRetrieverHandler extends FileRetrieverHandler {
  private readonly logger = new Logger(DoclingFileRetrieverHandler.name);
  private readonly doclingApi = getDoclingDocumentProcessingAPI();
  private readonly MAX_POLL_ATTEMPTS = 60;
  private readonly POLL_INTERVAL_MS = 2000;

  async processFile(file: File): Promise<FileRetrieverResult> {
    try {
      this.logger.debug(
        `Processing file with Docling: ${file.filename} (${file.fileType})`,
      );

      // Convert Buffer to Blob for upload
      const blobPart: BlobPart = file.fileData as unknown as BlobPart;
      const fileBlob = new Blob([blobPart], { type: file.fileType });

      // Submit conversion task
      const taskResponse =
        await this.doclingApi.convertDocumentUploadConvertUploadPost(
          { file: fileBlob },
          { output_format: 'markdown' },
        );

      this.logger.debug(`Docling task created: ${taskResponse.task_id}`);

      // Poll for completion
      const result = await this.pollForCompletion(taskResponse.task_id);

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

  private async pollForCompletion(taskId: string): Promise<ConversionResult> {
    for (let attempt = 0; attempt < this.MAX_POLL_ATTEMPTS; attempt++) {
      const result = await this.doclingApi.getTaskStatusTasksTaskIdGet(taskId);

      if (result.status === TaskStatus.completed) {
        return result;
      }

      if (result.status === TaskStatus.failed) {
        throw new FileRetrievalFailedError(
          result.error || 'Docling task failed',
          { taskId, provider: 'docling' },
        );
      }

      // Wait before next poll
      await this.sleep(this.POLL_INTERVAL_MS);
    }

    throw new FileRetrievalFailedError(
      `Docling task timed out after ${(this.MAX_POLL_ATTEMPTS * this.POLL_INTERVAL_MS) / 1000} seconds`,
      { taskId, provider: 'docling' },
    );
  }

  private parseResponse(result: ConversionResult): FileRetrieverResult {
    const content = result.content;

    if (!content) {
      throw new FileRetrievalFailedError('Empty content from Docling', {
        taskId: result.task_id,
        provider: 'docling',
      });
    }

    // Return as single page with markdown content
    const pages = [new FileRetrieverPage(content, 1)];

    return new FileRetrieverResult(pages, {
      provider: 'docling',
      taskId: result.task_id,
      pageCount: result.page_count,
      processingTimeMs: result.processing_time_ms,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
