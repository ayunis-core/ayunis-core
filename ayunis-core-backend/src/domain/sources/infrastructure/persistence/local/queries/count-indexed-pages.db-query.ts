import type { EntityManager } from 'typeorm';
import type { UUID } from 'crypto';

export async function countIndexedPages(
  manager: EntityManager,
  sourceId: UUID,
): Promise<number> {
  const [row] = await manager.query<{ pages: number }[]>(
    `SELECT COUNT(DISTINCT chunk.meta->>'url')::int AS pages
       FROM source_content_chunks chunk
       JOIN text_source_details_record details ON details.id = chunk."sourceId"
      WHERE details."sourceId" = $1`,
    [sourceId],
  );
  return row.pages;
}
