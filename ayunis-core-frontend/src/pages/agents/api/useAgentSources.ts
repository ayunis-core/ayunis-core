import { useAgentsControllerGetAgentSources } from "@/shared/api/generated/ayunisCoreAPI";

export function useAgentSources(agentId: string) {
  return useAgentsControllerGetAgentSources(agentId, {
    query: {
      enabled: !!agentId,
    },
  });
}