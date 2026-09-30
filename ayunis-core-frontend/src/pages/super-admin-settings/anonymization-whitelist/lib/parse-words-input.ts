/**
 * Splits the whitelist input into words. Only commas separate words, so
 * multi-word terms such as `Test 1` stay one entry.
 */
export function parseWordsInput(input: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];

  for (const segment of input.split(',')) {
    const word = segment.trim();
    const key = word.toLowerCase();
    if (word.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    words.push(word);
  }

  return words;
}
