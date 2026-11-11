import { useWorkspaceMembersControllerList } from '@/shared/api/generated/ayunisCoreAPI';

export function useWorkspaceMembers(workspaceId: string, enabled: boolean) {
  const { data, isLoading, isError } = useWorkspaceMembersControllerList(
    workspaceId,
    { query: { enabled } },
  );

  return { members: data ?? [], isLoading, isError };
}
