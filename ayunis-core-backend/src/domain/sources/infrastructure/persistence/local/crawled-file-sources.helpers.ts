import type { UUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileSourceDetailsRecord } from './schema/text-source-details.record';
import { TextSourceRecord } from './schema/source.record';
import { SourceRecord } from './schema/source.record';

export async function selectCrawledFilesWithinCapacity(
  manager: EntityManager,
  sourceId: UUID,
  files: FileSource[],
  maximumSources: number,
): Promise<FileSource[]> {
  const knowledgeBaseId = files[0]?.knowledgeBaseId;
  if (!knowledgeBaseId) return files;
  // Shares the collection lock with uploads and URL source creation.
  await manager
    .getRepository(SourceRecord)
    .createQueryBuilder('source')
    .innerJoin('source.knowledgeBase', 'kb')
    .where('source.id = :sourceId', { sourceId })
    .setLock('pessimistic_write', undefined, ['kb'])
    .getOne();
  const count = await manager
    .getRepository(SourceRecord)
    .count({ where: { knowledgeBaseId } });
  return files.slice(0, Math.max(0, maximumSources - count));
}

export async function insertCrawledFileSources(
  manager: EntityManager,
  files: FileSource[],
): Promise<void> {
  await manager.getRepository(TextSourceRecord).insert(
    files.map((file) => ({
      id: file.id,
      name: file.name,
      createdBy: file.createdBy,
      status: file.status,
      processingStartedAt: file.processingStartedAt,
      knowledgeBaseId: file.knowledgeBaseId,
      textType: file.textType,
      fileType: file.fileType,
      url: file.url,
    })),
  );
  await manager.getRepository(FileSourceDetailsRecord).insert(
    files.map((file) => ({
      id: file.id,
      fileType: file.fileType,
      source: { id: file.id },
      text: '',
    })),
  );
}
