import type { KnowledgeBaseResponseDto } from '@ayunis/api-client/schemas';

/**
 * The user's knowledge bases plus the routine's, so a linked one can always
 * be switched off, even when the user's list does not include it.
 */
export function routineKnowledgeBaseRows(
  available: KnowledgeBaseResponseDto[] = [],
  assigned: KnowledgeBaseResponseDto[] = [],
): KnowledgeBaseResponseDto[] {
  const availableIds = new Set(available.map(({ id }) => id));
  return [
    ...available,
    ...assigned.filter(({ id }) => !availableIds.has(id)),
  ].sort((a, b) => a.name.localeCompare(b.name));
}
