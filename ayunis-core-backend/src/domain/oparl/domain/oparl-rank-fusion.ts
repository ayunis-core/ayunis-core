/** The usual constant of reciprocal rank fusion; it damps the weight of the very first ranks. */
export const RRF_K = 60;

export interface OparlRanking<T> {
  query: string;
  ids: readonly T[];
}

export interface OparlFusedMatch<T> {
  id: T;
  score: number;
  matchedQueries: string[];
}

/**
 * Reciprocal rank fusion: every ranking adds 1 / (k + rank) to each ID it
 * holds. Uses ranks only, so full-text ranks and vector distances need no
 * common scale. Ties keep the order in which the IDs first appeared.
 */
export function fuseRankings<T>(
  rankings: readonly OparlRanking<T>[],
  k = RRF_K,
): OparlFusedMatch<T>[] {
  const fused = new Map<T, OparlFusedMatch<T>>();
  for (const { query, ids } of rankings) {
    ids.forEach((id, index) => {
      const match = fused.get(id) ?? { id, score: 0, matchedQueries: [] };
      match.score += 1 / (k + index + 1);
      if (!match.matchedQueries.includes(query)) {
        match.matchedQueries.push(query);
      }
      fused.set(id, match);
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score);
}
