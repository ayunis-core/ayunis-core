import type { CustomConfigFieldFormData } from '../model/types';

export const HTTP_HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export function findDuplicateHeaderIndexes(
  fields: CustomConfigFieldFormData[],
): number[] {
  const indexesByScopedHeader = new Map<string, number[]>();

  fields.forEach((field, index) => {
    const scopedHeader = `${field.scope}:${field.headerName.trim().toLowerCase()}`;
    const indexes = indexesByScopedHeader.get(scopedHeader) ?? [];
    indexes.push(index);
    indexesByScopedHeader.set(scopedHeader, indexes);
  });

  return [...indexesByScopedHeader.values()]
    .filter((indexes) => indexes.length > 1)
    .flat();
}
