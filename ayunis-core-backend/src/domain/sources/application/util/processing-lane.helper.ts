import { detectFileType, isAudioFile } from 'src/common/util/file-type';
import type { DocumentProcessingJobData } from 'src/domain/sources/application/ports/document-processing.port';

type LaneInput = Pick<
  DocumentProcessingJobData,
  'fileType' | 'fileName' | 'expectedSize'
>;

/**
 * Recordings always count: their size says little about their length, a few
 * megabytes of compressed speech can run for hours.
 */
export function isLongRunningJob(
  job: LaneInput,
  largeFileBytes: number,
): boolean {
  return (
    isAudioFile(detectFileType(job.fileType, job.fileName)) ||
    (job.expectedSize ?? 0) >= largeFileBytes
  );
}
