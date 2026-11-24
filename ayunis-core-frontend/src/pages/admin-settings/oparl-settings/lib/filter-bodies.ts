import type { OparlCatalogBodyResponseDto } from '@ayunis/api-client';

/** Bodies whose name, short name or system contains the search, ignoring case. */
export function filterBodies(
  bodies: OparlCatalogBodyResponseDto[],
  search: string,
): OparlCatalogBodyResponseDto[] {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) return bodies;
  return bodies.filter((body) =>
    [body.name, body.shortName, body.systemName].some((value) =>
      value?.toLocaleLowerCase().includes(needle),
    ),
  );
}
