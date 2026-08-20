import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
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
    findContentChunksByIds: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteMany: jest.fn().mockResolvedValue(undefined),
    findUnreferencedIds: jest.fn().mockResolvedValue([]),
    findPaginatedByWorkspaceId: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
    }),
  };
}
