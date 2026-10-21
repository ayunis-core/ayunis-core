import { useTranslation } from 'react-i18next';
import { useAuthenticationControllerMe } from '@/shared/api';
import {
  orgEditorsCopy,
  teamEditorsCopy,
} from '@/features/resource-ownership/lib/owner-copy';
import type {
  OwnedResource,
  OwnedResourceKind,
  OwnerOption,
} from '@/features/resource-ownership/model/types';

export function useOwnershipCopy(kind: OwnedResourceKind) {
  const { t } = useTranslation('resource-ownership');
  const { data: me } = useAuthenticationControllerMe();
  const noun = t(`nouns.${kind}`);

  function optionLabel(option: OwnerOption): string {
    return option.type === 'team'
      ? t('options.team', { team: option.teamName })
      : t(`options.${option.type}`);
  }

  function optionHint(
    option: OwnerOption,
    orgEditorsIncludeNonAdmins: boolean,
  ): string {
    if (option.type === 'team') {
      const editors = teamEditorsCopy(option.editors ?? [], me?.id);
      return t('hints.team', {
        team: option.teamName,
        editors: t(editors.key, editors.values),
      });
    }
    if (option.type === 'org') {
      return t('hints.org', {
        total: option.memberCount,
        editors: t(orgEditorsCopy(orgEditorsIncludeNonAdmins).key),
      });
    }
    return t('hints.personal');
  }

  function cardTitle(resource: OwnedResource): string {
    if (resource.ownerType === 'team') {
      return t('card.title.team', {
        team: resource.ownerDescription?.teamName ?? '',
      });
    }
    return t(`card.title.${resource.ownerType === 'org' ? 'org' : 'personal'}`);
  }

  function cardSentence(resource: OwnedResource): string {
    const description = resource.ownerDescription;
    if (resource.ownerType === 'team') {
      const editors = teamEditorsCopy(description?.teamEditors ?? [], me?.id);
      return `${t('card.audience.team', { noun, total: description?.audienceCount ?? 0 })} ${t(editors.key, editors.values)}`;
    }
    if (resource.ownerType === 'org') {
      const editors = orgEditorsCopy(
        description?.orgEditorsIncludeNonAdmins ?? false,
      );
      return `${t('card.audience.org', { noun, total: description?.audienceCount ?? 0 })} ${t(editors.key)}`;
    }
    return t('card.audience.personal', { noun });
  }

  return { optionLabel, optionHint, cardTitle, cardSentence };
}
