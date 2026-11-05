import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { type Sort, SortOrder } from 'src/common/sorting/sort';

export function applySort<Entity extends ObjectLiteral, Field extends string>(
  queryBuilder: SelectQueryBuilder<Entity>,
  columns: Record<Field, string>,
  sort: Sort<Field>,
  tieBreakerColumn: string,
): SelectQueryBuilder<Entity> {
  const direction = sort.order === SortOrder.ASC ? 'ASC' : 'DESC';
  // The tie-breaker keeps rows with equal sort values in a fixed order, so they
  // cannot move between pages when paginating.
  return queryBuilder
    .orderBy(columns[sort.field], direction)
    .addOrderBy(tieBreakerColumn, direction);
}
