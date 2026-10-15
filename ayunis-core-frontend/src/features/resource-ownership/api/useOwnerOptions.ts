import {
  useKnowledgeBasesControllerOwnerOptions,
  useSkillsControllerOwnerOptions,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  OwnedResourceKind,
  OwnerOption,
} from '@/features/resource-ownership/model/types';

export interface OwnerOptionsState {
  options: OwnerOption[];
  orgEditorsIncludeNonAdmins: boolean;
  isLoading: boolean;
}

export function useOwnerOptions(kind: OwnedResourceKind): OwnerOptionsState {
  const skills = useSkillsControllerOwnerOptions({
    query: { enabled: kind === 'skill' },
  });
  const knowledgeBases = useKnowledgeBasesControllerOwnerOptions({
    query: { enabled: kind === 'knowledge_base' },
  });
  const { data, isLoading } = kind === 'skill' ? skills : knowledgeBases;
  return {
    options: data?.options ?? [],
    orgEditorsIncludeNonAdmins: data?.orgEditorsIncludeNonAdmins ?? false,
    isLoading,
  };
}
