import { tmpdir } from 'os';
import { join } from 'path';
import type { ConfigType } from '@nestjs/config';
import type transcriptionConfig from 'src/config/transcription.config';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';
import type { StoredSourceFileService } from 'src/domain/sources/application/services/stored-source-file.service';
import type { LocalFile } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { processingStage } from './job-telemetry';
import { withStagingDirectory } from './staging-directory';

/** Recordings are staged under the transcription temp directory. */
export function audioStagingRoot(
  transcription: ConfigType<typeof transcriptionConfig>,
): string {
  return transcription.tempDirectory ?? join(tmpdir(), 'ayunis-audio');
}

// PDFs, office documents and recordings are streamed to disk and processed
// from there: the process never holds the file, and splitting, conversion,
// segmenting and the provider upload all read the path.
export function withStagedJobFile<T>(
  storedFiles: StoredSourceFileService,
  data: DocumentProcessingJobData,
  root: string,
  use: (localFile: LocalFile) => Promise<T>,
): Promise<T> {
  const { minioPath, expectedSize, expectedETag } = data;
  return withStagingDirectory(root, async (directory) => {
    const path = join(directory, 'file');
    const stored = await processingStage('document.download', () =>
      data.retainFile
        ? storedFiles.readRetainedToFile(
            minioPath,
            path,
            expectedSize,
            expectedETag,
          )
        : storedFiles.readToFile(minioPath, path, expectedSize, expectedETag),
    );
    return processingStage('document.extraction', () =>
      use({ path, ...stored }),
    );
  });
}
