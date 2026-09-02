import {
  ALL_SOURCE_HITS,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';

export interface SourceGroup {
  key: string;
  hitIds: string[];
  firstHitId: string;
}

function groupKey(hit: SourceHit): string {
  return hit.kind === 'web' ? hit.url : hit.title;
}

export function groupSourceHits(sourceIds: string[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  for (const id of sourceIds) {
    const key = groupKey(ALL_SOURCE_HITS[id]);
    const existing = groups.get(key);
    if (existing) {
      existing.hitIds.push(id);
      continue;
    }
    groups.set(key, { key, hitIds: [id], firstHitId: id });
  }
  return [...groups.values()];
}

export function stellenLabel(count: number): string {
  return count === 1 ? '1 Stelle' : `${count} Stellen`;
}
