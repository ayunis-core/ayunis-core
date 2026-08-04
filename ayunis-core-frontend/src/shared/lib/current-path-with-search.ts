export function currentPathWithSearch(
  location: Pick<Location, 'pathname' | 'search'>,
): string {
  return `${location.pathname}${location.search}`;
}
