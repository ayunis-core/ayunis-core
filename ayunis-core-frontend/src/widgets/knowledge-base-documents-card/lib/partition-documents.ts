import {
  KnowledgeBaseDocumentResponseDtoStatus,
  type KnowledgeBaseDocumentResponseDto,
  type SyncedLocationResponseDto,
} from '@ayunis/api-client/schemas';

export interface SyncedLocationFiles {
  location: SyncedLocationResponseDto;
  files: KnowledgeBaseDocumentResponseDto[];
  /** Files whose processing has ended, successfully or not. */
  processed: number;
  /**
   * The location's documents, also those a sync reported before the
   * documents list has them.
   */
  total: number;
}

export interface PartitionedDocuments {
  locations: SyncedLocationFiles[];
  looseDocuments: KnowledgeBaseDocumentResponseDto[];
}

const SETTLED: ReadonlySet<string> = new Set([
  KnowledgeBaseDocumentResponseDtoStatus.ready,
  KnowledgeBaseDocumentResponseDtoStatus.failed,
]);

/**
 * Puts each synced document under its location, by name, and keeps the rest
 * (uploads, URLs, and documents of locations not shown) as they come.
 */
export function partitionDocuments(
  documents: KnowledgeBaseDocumentResponseDto[],
  locations: SyncedLocationResponseDto[],
): PartitionedDocuments {
  const shown = new Set(locations.map((location) => location.id));
  const byLocation = new Map<string, KnowledgeBaseDocumentResponseDto[]>();
  const looseDocuments: KnowledgeBaseDocumentResponseDto[] = [];
  for (const doc of documents) {
    const locationId = doc.syncedLocationId;
    if (locationId && shown.has(locationId)) {
      byLocation.set(locationId, [...(byLocation.get(locationId) ?? []), doc]);
    } else {
      looseDocuments.push(doc);
    }
  }
  return {
    locations: locations.map((location) => {
      const files = (byLocation.get(location.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return {
        location,
        files,
        processed: files.filter((file) => SETTLED.has(file.status)).length,
        total: Math.max(files.length, location.documentCount),
      };
    }),
    looseDocuments,
  };
}
