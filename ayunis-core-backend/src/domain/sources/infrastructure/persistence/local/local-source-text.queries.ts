import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import type { TextSourceDetailsRecord } from './schema/text-source-details.record';

export async function extractSourceTextLines(
  repository: Repository<TextSourceDetailsRecord>,
  sourceId: UUID,
  startLine: number,
  endLine: number,
): Promise<{ totalLines: number; text: string } | null> {
  const result: { totalLines: string; text: string }[] = await repository.query(
    `SELECT
      array_length(string_to_array(text, E'\\n'), 1) AS "totalLines",
      array_to_string(
        (string_to_array(text, E'\\n'))[$1:$2],
        E'\\n'
      ) AS "text"
    FROM text_source_details_record
    WHERE "sourceId" = $3`,
    [startLine, endLine, sourceId],
  );
  if (result.length === 0) {
    return null;
  }
  return {
    totalLines: parseInt(result[0].totalLines, 10),
    text: result[0].text,
  };
}
