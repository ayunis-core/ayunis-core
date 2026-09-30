import {
  KnowledgeBaseDocumentResponseDtoStatus,
  KnowledgeBaseDocumentResponseDtoTextType,
  ReindexIntervalUnit,
  type KnowledgeBaseDocumentResponseDto,
  type ReindexIntervalDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ReindexIntervalFormFields } from '@/widgets/knowledge-base-documents-card/model/types';

export const REINDEX_INTERVAL_MAX_VALUE: Record<ReindexIntervalUnit, number> = {
  [ReindexIntervalUnit.weeks]: 52,
  [ReindexIntervalUnit.months]: 12,
};

export const DEFAULT_REINDEX_INTERVAL_FIELDS: ReindexIntervalFormFields = {
  enabled: false,
  value: 1,
  unit: ReindexIntervalUnit.months,
};

/**
 * Only a ready web source can be scheduled: the crawl URL is the only raw
 * input kept, and editing while a run is processing could be overwritten
 * when that run settles.
 */
export function canScheduleReindex(
  document: KnowledgeBaseDocumentResponseDto,
): boolean {
  return (
    document.status === KnowledgeBaseDocumentResponseDtoStatus.ready &&
    document.textType === KnowledgeBaseDocumentResponseDtoTextType.web
  );
}

export function hasFailedSinceLastIndex(
  document: KnowledgeBaseDocumentResponseDto,
): boolean {
  if (!document.lastRunFailedAt) return false;
  if (!document.lastIndexedAt) return true;
  return (
    new Date(document.lastRunFailedAt).getTime() >
    new Date(document.lastIndexedAt).getTime()
  );
}

export function toReindexIntervalFields(
  interval: ReindexIntervalDto | null | undefined,
): ReindexIntervalFormFields {
  return interval
    ? { enabled: true, value: interval.value, unit: interval.unit }
    : DEFAULT_REINDEX_INTERVAL_FIELDS;
}

export function toReindexIntervalDto(
  fields: ReindexIntervalFormFields,
): ReindexIntervalDto | null {
  return fields.enabled
    ? { value: Number(fields.value), unit: fields.unit }
    : null;
}
