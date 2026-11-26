export const MAX_MARKETPLACE_SUGGESTIONS = 6;

interface SuggestableEntry {
  name: string;
  featured: boolean;
  suggested: boolean;
}

/** The entries Core suggests on its empty skills and routines pages. */
export function selectMarketplaceSuggestions<T extends SuggestableEntry>(
  entries: readonly T[],
): T[] {
  return entries
    .filter((entry) => entry.suggested)
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        a.name.localeCompare(b.name, 'de'),
    )
    .slice(0, MAX_MARKETPLACE_SUGGESTIONS);
}
