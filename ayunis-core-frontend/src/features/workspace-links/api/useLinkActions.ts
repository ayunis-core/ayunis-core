import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  knowledgeBaseLinksControllerLink,
  knowledgeBaseLinksControllerUnlink,
  skillLinksControllerLink,
  skillLinksControllerUnlink,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { LinkKind } from '@/features/workspace-links/model/types';
import { useRefreshLinks } from './useRefreshLinks';

export function useLinkItems(kind: LinkKind, workspaceId: string) {
  const { t } = useTranslation('workspace');
  const refresh = useRefreshLinks(kind, workspaceId);

  return useMutation({
    mutationFn: (ids: string[]) =>
      kind === 'skill'
        ? skillLinksControllerLink(workspaceId, { skillIds: ids })
        : knowledgeBaseLinksControllerLink(workspaceId, {
            knowledgeBaseIds: ids,
          }),
    onSuccess: () => {
      showSuccess(t('links.picker.linked'));
      void refresh();
    },
    onError: () => showError(t('links.picker.error')),
  });
}

export function useUnlinkItem(kind: LinkKind, workspaceId: string) {
  const { t } = useTranslation('workspace');
  const refresh = useRefreshLinks(kind, workspaceId);

  return useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      kind === 'skill'
        ? skillLinksControllerUnlink(workspaceId, id)
        : knowledgeBaseLinksControllerUnlink(workspaceId, id),
    onSuccess: async (_data, { name }) => {
      showSuccess(t('links.unlink.success', { name }));
      await refresh();
    },
    onError: () => showError(t('links.unlink.error')),
  });
}
