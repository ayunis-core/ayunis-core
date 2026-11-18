import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { SourceReindexRepository } from 'src/domain/sources/application/ports/source-reindex.repository';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';

// Port mock factory — defaults model the "empty" state: finders resolve to
// null/[], save echoes its argument, deletes resolve, guarded UPDATEs report
// success. Tests override per case.
export function createMockSourceRepository(): jest.Mocked<SourceRepository> {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByIds: jest.fn().mockResolvedValue([]),
    findByKnowledgeBaseId: jest.fn().mockResolvedValue([]),
    completeCrawlWithFileSources: jest.fn(),
    saveProcessingTextSourceContent: jest.fn(),
    saveTextSource: jest
      .fn()
      .mockImplementation((source: TextSource) => Promise.resolve(source)),
    findStaleProcessingSourceIds: jest.fn().mockResolvedValue([]),
    save: jest
      .fn()
      .mockImplementation((source: Source) => Promise.resolve(source)),
    updateStatusConditionally: jest.fn().mockResolvedValue(true),
    refreshProcessingHeartbeat: jest.fn().mockResolvedValue(true),
    updateCsvSourceData: jest.fn().mockResolvedValue(true),
    extractTextLines: jest.fn().mockResolvedValue(null),
    findCitationTarget: jest.fn().mockResolvedValue(null),
    findContentChunksByIds: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteMany: jest.fn().mockResolvedValue(undefined),
    findUnreferencedIds: jest.fn().mockResolvedValue([]),
    findOrphanedIds: jest.fn().mockResolvedValue([]),
    hasIndexedSourceInOrgs: jest.fn().mockResolvedValue(false),
    findReferencedStorageKeys: jest.fn().mockResolvedValue([]),
  };
}

export function createMockSourceReindexRepository(): jest.Mocked<SourceReindexRepository> {
  return {
    recordEmbeddingModel: jest.fn().mockResolvedValue(undefined),
    flagOrgSourcesForReindex: jest.fn().mockResolvedValue([]),
    flagIfIndexedWithOtherModel: jest.fn().mockResolvedValue(false),
    claimStaleReindexing: jest.fn().mockResolvedValue([]),
    lockReindexing: jest.fn().mockResolvedValue(true),
    isReindexing: jest.fn().mockResolvedValue(false),
    deferReindex: jest.fn().mockResolvedValue(true),
    findContentChunks: jest.fn().mockResolvedValue([]),
    completeReindex: jest.fn().mockResolvedValue(true),
    releaseReindexing: jest.fn().mockResolvedValue(true),
    failReindex: jest.fn().mockResolvedValue(true),
  };
}
