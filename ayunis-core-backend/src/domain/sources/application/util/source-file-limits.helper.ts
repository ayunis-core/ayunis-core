import {
  isAudioFile,
  isCSVFile,
  isDocumentSourceFile,
  isSpreadsheetFile,
  type DetectedFileType,
} from 'src/common/util/file-type';

export interface SourceFileLimits {
  /** What the target allows for documents of any other type. */
  documentMaxBytes: number;
  pdfMaxBytes: number;
  audioMaxBytes: number;
}

/** Whether the document pipeline reads the type: documents and tables. */
export function isDocumentPipelineFile(detected: DetectedFileType): boolean {
  return (
    isDocumentSourceFile(detected) ||
    isCSVFile(detected) ||
    isSpreadsheetFile(detected)
  );
}

// Two types do not follow the document limit the target passes in.
// Recordings (AUDIO_MAX_UPLOAD_BYTES) are sent to the transcription provider
// whole, so their cap follows what one request may carry. PDFs
// (PDF_MAX_UPLOAD_BYTES) are processed from disk, so their size no longer
// drives memory use (AYC-1729).
export function maxSourceFileBytes(
  detected: DetectedFileType,
  limits: SourceFileLimits,
): number {
  if (isAudioFile(detected)) return limits.audioMaxBytes;
  if (detected === 'pdf') return limits.pdfMaxBytes;
  return limits.documentMaxBytes;
}
