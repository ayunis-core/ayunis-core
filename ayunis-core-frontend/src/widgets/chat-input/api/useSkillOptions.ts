import {
  useSkillsControllerFindAll,
  useWorkspaceContextControllerFindContext,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';

export interface SkillOption {
  id: string;
  name: string;
  workspaceId?: string;
}

interface UseSkillOptionsParams {
  workspaceId?: string | null;
  enabled?: boolean;
}

export function useSkillOptions({
  workspaceId,
  enabled = true,
}: Readonly<UseSkillOptionsParams> = {}): SkillOption[] {
  const { data: personalResponse } = useSkillsControllerFindAll(
    personalSkillListParams,
    { query: { enabled } },
  );
  const workspaceQuery = useWorkspaceContextControllerFindContext(
    workspaceId ?? '',
    { query: { enabled: enabled && Boolean(workspaceId) } },
  );

  const byId = new Map<string, SkillOption>();
  if (workspaceId) {
    for (const skill of workspaceQuery.data?.skills ?? []) {
      if (skill.isActive) {
        byId.set(skill.id, { id: skill.id, name: skill.name, workspaceId });
      }
    }
  }
  for (const skill of personalResponse?.data ?? []) {
    if (skill.isActive && !byId.has(skill.id)) {
      byId.set(skill.id, { id: skill.id, name: skill.name });
    }
  }
  return [...byId.values()];
}
