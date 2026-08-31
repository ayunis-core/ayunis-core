import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';

export function mergeRunKnowledgeBases(
  ...groups: readonly KnowledgeBaseSummary[][]
): KnowledgeBaseSummary[] {
  const merged = new Map<string, KnowledgeBaseSummary>();
  for (const group of groups) {
    for (const knowledgeBase of group) {
      if (!merged.has(knowledgeBase.id)) {
        merged.set(knowledgeBase.id, knowledgeBase);
      }
    }
  }
  return [...merged.values()];
}
