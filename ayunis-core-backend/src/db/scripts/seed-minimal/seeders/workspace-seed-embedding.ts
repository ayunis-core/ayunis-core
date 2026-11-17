export function hasDifferentEmbedding(
  current: number[] | null,
  next: number[],
): boolean {
  if (current?.length !== next.length) return true;
  return current.some((value, index) => value !== next[index]);
}

export function buildSeedEmbedding(content: string): number[] {
  const values = Array.from({ length: 1024 }, (_, index) => {
    const code = content.charCodeAt(index % content.length) || 1;
    return (code % 97) / 97;
  });
  values[0] = 1;
  return values;
}
