/**
 * The searchable text of a paper, meeting or agenda item: its text fields
 * (names, reference, result, resolution text) in order, one per line.
 */
export function oparlObjectText(parts: Array<string | null>): string {
  return parts
    .map((part) => part?.trim() ?? '')
    .filter((part) => part.length > 0)
    .join('\n');
}
