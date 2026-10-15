import { useTranslation } from 'react-i18next';
import type { LinkKind } from '@/features/workspace-links/model/types';
import { useLinkedWorkspaces } from './useLinkedWorkspaces';

export function useLinkedDeleteHint(
  kind: LinkKind,
  id: string,
  enabled: boolean,
): { hint: string; isKnown: boolean } {
  const { t } = useTranslation('workspace');
  const { total, isKnown } = useLinkedWorkspaces(kind, id, enabled);
  return {
    hint: total > 0 ? ` ${t('links.deleteHint', { count: total })}` : '',
    isKnown,
  };
}
