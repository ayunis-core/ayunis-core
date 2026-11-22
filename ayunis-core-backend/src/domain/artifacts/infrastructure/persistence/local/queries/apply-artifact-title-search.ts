import type { SelectQueryBuilder } from 'typeorm';
import type { ArtifactRecord } from 'src/domain/artifacts/infrastructure/persistence/local/schema/artifact.record';

/**
 * The title as users see it: in an anonymous artifact's title, every
 * placeholder its dictionary knows is replaced by the real value. The title is
 * split into placeholders, runs of other text and stray braces, and joined
 * back in order.
 */
const SHOWN_TITLE_SQL = `CASE WHEN artifact.isAnonymous THEN COALESCE((
  SELECT string_agg(COALESCE(mask.value, part.piece[1]), '' ORDER BY part.position)
  FROM regexp_matches(artifact.title, '\\{\\{pii:[A-Z_]+_[0-9]+\\}\\}|[^{]+|\\{', 'g')
    WITH ORDINALITY AS part(piece, position)
  LEFT JOIN artifact_pii_masks mask
    ON mask."artifactId" = artifact.id
    AND '{{pii:' || upper(CAST(mask.category AS text)) || '_' || mask."maskIndex" || '}}' = part.piece[1]
), '') ELSE artifact.title END`;

export function applyArtifactTitleSearch(
  queryBuilder: SelectQueryBuilder<ArtifactRecord>,
  search: string,
): void {
  queryBuilder.andWhere(`(${SHOWN_TITLE_SQL}) ILIKE :search`, {
    search: `%${search}%`,
  });
}
