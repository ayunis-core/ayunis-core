export function hasDifferentEmbedding(
  current: number[] | null,
  next: number[],
): boolean {
  const currentArray = parseEmbedding(current);
  if (currentArray.length !== next.length) return true;
  return currentArray.some((value, index) => value !== next[index]);
}

function parseEmbedding(current: number[] | null): number[] {
  if (Array.isArray(current)) return current;
  const serialized = current as unknown;
  if (typeof serialized !== 'string') return [];
  return serialized
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((value) => Number(value.trim()));
}

export function buildSeedEmbedding(content: string): number[] {
  const values = Array.from({ length: 1024 }, (_, index) => {
    const code = content.charCodeAt(index % content.length) || 1;
    return (code % 97) / 97;
  });
  values[0] = 1;
  return values;
}
