import {
  useKnowledgeBasesControllerFindAll,
  useSkillKnowledgeBasesControllerListSkillKnowledgeBases,
} from '@/shared/api/generated/ayunisCoreAPI';

/**
 * Hook to fetch both available and assigned knowledge bases for a skill
 */
export function useSkillKnowledgeBasesQueries(skillId: string) {
  const {
    data: availableKnowledgeBases,
    isLoading: loadingAvailable,
    isError: errorAvailable,
    refetch: refetchAvailable,
  } = useKnowledgeBasesControllerFindAll();

  const {
    data: assignedKnowledgeBases,
    isLoading: loadingAssigned,
    isError: errorAssigned,
    refetch: refetchAssigned,
  } = useSkillKnowledgeBasesControllerListSkillKnowledgeBases(skillId);

  return {
    availableKnowledgeBases: availableKnowledgeBases?.data,
    assignedKnowledgeBases,
    isLoading: loadingAvailable || loadingAssigned,
    isError: errorAvailable || errorAssigned,
    refetch: () => {
      void refetchAvailable();
      void refetchAssigned();
    },
  };
}
