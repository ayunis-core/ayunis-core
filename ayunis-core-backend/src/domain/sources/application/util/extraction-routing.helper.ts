import type { DetectedFileType } from 'src/common/util/file-type';
import type { ExtractionConfig } from 'src/config/extraction.config';

/**
 * Contract §1.1: documents, Office formats, email and plain text go to the
 * service; audio and spreadsheets stay in the backend.
 */
const EXTRACTION_SERVICE_TYPES: ReadonlySet<DetectedFileType> =
  new Set<DetectedFileType>([
    'pdf',
    'docx',
    'pptx',
    'odt',
    'odp',
    'eml',
    'msg',
    'txt',
  ]);

export function usesExtractionService(
  config: Pick<ExtractionConfig, 'url'>,
  fileType: DetectedFileType,
): boolean {
  return config.url !== undefined && EXTRACTION_SERVICE_TYPES.has(fileType);
}
