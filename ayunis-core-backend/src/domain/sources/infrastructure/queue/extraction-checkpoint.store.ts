import { Injectable, Logger } from '@nestjs/common';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { UploadObjectCommand } from 'src/domain/storage/application/use-cases/upload-object/upload-object.command';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { ListObjectsCommand } from 'src/domain/storage/application/use-cases/list-objects/list-objects.command';
import { downloadMinioFile } from '../../application/util/minio-processing-file.helpers';

export interface CheckpointedPage {
  /** 1-based page number. */
  number: number;
  text: string;
}

/**
 * Persists extracted page batches under the source's processing prefix so a
 * job retry resumes instead of re-extracting (and re-paying OCR for) pages
 * that already succeeded. The prefix purge on job completion removes the
 * checkpoints together with the staged file.
 */
@Injectable()
export class ExtractionCheckpointStore {
  private readonly logger = new Logger(ExtractionCheckpointStore.name);

  constructor(
    private readonly uploadObjectUseCase: UploadObjectUseCase,
    private readonly downloadObjectUseCase: DownloadObjectUseCase,
    private readonly listObjectsUseCase: ListObjectsUseCase,
  ) {}

  async restore(processingDir: string): Promise<CheckpointedPage[]> {
    const objectNames = await this.listObjectsUseCase.execute(
      new ListObjectsCommand(this.batchesPrefix(processingDir)),
    );

    const byNumber = new Map<number, CheckpointedPage>();
    for (const objectName of objectNames) {
      const pages = await this.readBatch(objectName);
      for (const page of pages) {
        byNumber.set(page.number, page);
      }
    }
    return [...byNumber.values()];
  }

  /** Best-effort: a failed checkpoint write must not fail the batch. */
  async saveBatch(
    processingDir: string,
    pages: CheckpointedPage[],
  ): Promise<void> {
    if (pages.length === 0) {
      return;
    }
    const numbers = pages.map((page) => page.number);
    const objectName = `${this.batchesPrefix(processingDir)}pages-${Math.min(...numbers)}-${Math.max(...numbers)}.json`;
    try {
      await this.uploadObjectUseCase.execute(
        new UploadObjectCommand(
          objectName,
          Buffer.from(JSON.stringify({ pages }), 'utf8'),
        ),
      );
    } catch (error) {
      this.logger.warn('Failed to write extraction checkpoint', {
        objectName,
        error: error as Error,
      });
    }
  }

  private async readBatch(objectName: string): Promise<CheckpointedPage[]> {
    try {
      const buffer = await downloadMinioFile(
        this.downloadObjectUseCase,
        objectName,
      );
      const parsed = JSON.parse(buffer.toString('utf8')) as {
        pages?: CheckpointedPage[];
      };
      return (parsed.pages ?? []).filter(
        (page) =>
          typeof page.number === 'number' && typeof page.text === 'string',
      );
    } catch (error) {
      // An unreadable checkpoint just means those pages get re-extracted.
      this.logger.warn('Skipping unreadable extraction checkpoint', {
        objectName,
        error: error as Error,
      });
      return [];
    }
  }

  private batchesPrefix(processingDir: string): string {
    return `${processingDir}/batches/`;
  }
}
