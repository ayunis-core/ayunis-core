import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
} from '@/features/feature-toggles';
import {
  useKnowledgeBasesControllerFindAll,
  useSkillsControllerFindAll,
  useWorkspaceContextControllerFindContext,
} from '@/shared/api/generated/ayunisCoreAPI';

export interface AvailabilityEntry {
  id: string;
  name: string;
  description: string;
}

export interface Availability {
  skills: AvailabilityEntry[];
  knowledgeBases: AvailabilityEntry[];
  projectSkills: number;
  projectKnowledge: number;
}

export function useAvailability(workspaceId: string | null): Availability {
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const { data: skills } = useSkillsControllerFindAll({
    query: { enabled: skillsEnabled },
  });
  const { data: knowledgeBases } = useKnowledgeBasesControllerFindAll({
    query: { enabled: knowledgeBasesEnabled },
  });
  const { data: workspaceContext } = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    { query: { enabled: Boolean(workspaceId) } },
  );

  return {
    skills: (skills ?? []).map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.shortDescription,
    })),
    knowledgeBases: (knowledgeBases?.data ?? []).map((base) => ({
      id: base.id,
      name: base.name,
      description: base.description,
    })),
    projectSkills: workspaceContext?.skills.length ?? 0,
    projectKnowledge:
      (workspaceContext?.knowledgeBases.length ?? 0) +
      (workspaceContext?.documents.length ?? 0),
  };
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
