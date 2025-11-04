import {
  useMcpIntegrationsControllerListAvailable,
  useAgentsControllerListAgentMcpIntegrations,
} from "@/shared/api/generated/ayunisCoreAPI";

/**
 * Hook to fetch both available and assigned MCP integrations for an agent
 */
export function useAgentMcpIntegrationsQueries(agentId: string) {
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
  } = useAgentsControllerListAgentMcpIntegrations(agentId);

  return {
    availableIntegrations,
    assignedIntegrations,
    isLoading: loadingAvailable || loadingAssigned,
    isError: errorAvailable || errorAssigned,
    refetch: () => {
      refetchAvailable();
      refetchAssigned();
    },
  };
}
