import {
  useMcpIntegrationsControllerListAvailable,
  useSkillsControllerListSkillMcpIntegrations,
} from '@/shared/api/generated/ayunisCoreAPI';

/**
 * Hook to fetch both available and assigned MCP integrations for a skill
 */
export function useSkillMcpIntegrationsQueries(skillId: string) {
  const {
    data: availableIntegrations,
    isLoading: loadingAvailable,
    isError: errorAvailable,
    refetch: refetchAvailable,
  } = useMcpIntegrationsControllerListAvailable();

  const {
    data: assignedIntegrations,
    isLoading: loadingAssigned,
    isError: errorAssigned,
    refetch: refetchAssigned,
  } = useSkillsControllerListSkillMcpIntegrations(skillId);

  return {
    availableIntegrations,
    assignedIntegrations,
    isLoading: loadingAvailable || loadingAssigned,
    isError: errorAvailable || errorAssigned,
    refetch: () => {
      void refetchAvailable();
      void refetchAssigned();
    },
  };
}
