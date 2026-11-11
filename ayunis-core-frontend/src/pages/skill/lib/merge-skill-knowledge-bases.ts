import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Merges the knowledge bases the viewer may link with the ones assigned to the
 * skill, so assigned collections render even when they are not in the
 * linkable list.
 */
export function mergeSkillKnowledgeBases(
  available: KnowledgeBaseResponseDto[],
  assigned: KnowledgeBaseResponseDto[],
): KnowledgeBaseResponseDto[] {
  const availableIds = new Set(available.map((kb) => kb.id));
  const assignedOnly = assigned.filter((kb) => !availableIds.has(kb.id));

  return [...available, ...assignedOnly].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
