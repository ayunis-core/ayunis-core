import type { LinkKind } from '@/features/workspace-links';

export function linkCopyKey(
  kind: LinkKind,
): 'links.skills' | 'links.knowledge' {
  return kind === 'skill' ? 'links.skills' : 'links.knowledge';
}
