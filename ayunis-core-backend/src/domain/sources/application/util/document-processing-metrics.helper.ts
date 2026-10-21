import { Appsignal } from '@appsignal/nodejs';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';

export const DOCUMENT_PROCESSING_STAGES = [
  'preflight',
  'upload',
  'download',
  'conversion',
  'extraction',
  'chunking',
  'persist',
  'embedding',
  'indexing',
  'total',
] as const;

export type DocumentProcessingStage =
  (typeof DOCUMENT_PROCESSING_STAGES)[number];

export type DocumentProcessingDurations = Partial<
  Record<DocumentProcessingStage, number>
>;

export const DOCUMENT_PROCESSING_STAGE_DURATION_METRIC =
  'document_processing_stage_duration_ms';
export const DOCUMENT_PROCESSING_FILE_SIZE_METRIC =
  'document_processing_file_size_bytes';
export const DOCUMENT_PROCESSING_PAGE_COUNT_METRIC =
  'document_processing_page_count';
export const SOURCE_PROCESSING_FAILURE_METRIC =
  'source_processing_failure_count';

function safely(report: () => void): void {
  try {
    report();
  } catch {
    // Telemetry must never replace or alter the processing outcome.
  }
}

export function recordDocumentProcessingStages(
  durations: DocumentProcessingDurations,
  fileType: string,
): void {
  safely(() => {
    const metrics = Appsignal.client.metrics();
    for (const stage of DOCUMENT_PROCESSING_STAGES) {
      const durationMs = durations[stage];
      if (durationMs === undefined) continue;
      metrics.addDistributionValue(
        DOCUMENT_PROCESSING_STAGE_DURATION_METRIC,
        Math.round(durationMs),
        { stage, file_type: fileType },
      );
    }
  });
}

export function recordDocumentProcessingSize(
  document: { fileSizeBytes: number; pageCount: number },
  fileType: string,
): void {
  safely(() => {
    const metrics = Appsignal.client.metrics();
    const tags = { file_type: fileType };
    metrics.addDistributionValue(
      DOCUMENT_PROCESSING_FILE_SIZE_METRIC,
      document.fileSizeBytes,
      tags,
    );
    metrics.addDistributionValue(
      DOCUMENT_PROCESSING_PAGE_COUNT_METRIC,
      document.pageCount,
      tags,
    );
  });
}

export function recordSourceProcessingFailure(
  errorCode: SourceProcessingErrorCode | undefined,
  sourceType: string,
): void {
  safely(() => {
    Appsignal.client
      .metrics()
      .incrementCounter(SOURCE_PROCESSING_FAILURE_METRIC, 1, {
        error_code: errorCode ?? 'none',
        source_type: sourceType,
      });
  });
}
