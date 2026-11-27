import {
  useSkillsControllerFindAll,
  useWorkspaceContextControllerFindContext,
} from '@ayunis/api-client/endpoints';
import type { ChatMenuStatus, ChatPinnedSkill } from '@ayunis/chat/surface';
import { personalSkillListParams } from '@/shared/api/skill-scopes';

function workspaceStatus(
  workspaceId: string | null,
  query: { isPending: boolean; isError: boolean },
): ChatMenuStatus {
  if (!workspaceId) return 'ready';
  if (query.isError) return 'error';
  return query.isPending ? 'loading' : 'ready';
}

/** The user's pinned skills, plus the active pins of the selected workspace. */
export function useNewChatPinnedSkills(workspaceId: string | null): {
  items: ChatPinnedSkill[];
  status: ChatMenuStatus;
} {
  const { data: skillsResponse } = useSkillsControllerFindAll(
    personalSkillListParams,
  );
  const workspaceQuery = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    { query: { enabled: Boolean(workspaceId) } },
  );
  const personal = (skillsResponse?.data ?? [])
    .filter((skill) => skill.isPinned)
    .map(({ id, name }) => ({ id, name }));
  const workspace = workspaceId
    ? (workspaceQuery.data?.skills ?? [])
        .filter((skill) => skill.isActive && skill.isPinned)
        .map(({ id, name }) => ({ id, name, workspaceId }))
    : [];
  return {
    items: [...personal, ...workspace],
    status: workspaceStatus(workspaceId, workspaceQuery),
  };
}
