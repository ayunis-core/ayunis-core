import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Merges the viewer's accessible knowledge bases with the ones assigned to the
 * skill, so assigned collections render even when the viewer cannot access
 * them directly (e.g. while reviewing a handover). Available entries win on
 * duplicate ids because they carry the viewer's own activation state.
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
