import { useTranslation } from 'react-i18next';
import { useAuthorization, useMyTeams } from '@/features/permissions';
import {
  canManageResource,
  manageableOwners,
  ownerKey,
} from '@/features/resource-ownership/lib/ownership';
import type {
  OwnedResource,
  OwnedResourceKind,
  OwnerOption,
  OwnerSelection,
} from '@/features/resource-ownership/model/types';

/**
 * The owners the user may create for or move a resource to, and whether they
 * may manage a given resource. The backend enforces the same rules.
 */
export function useResourceOwnership(kind: OwnedResourceKind) {
  const { t } = useTranslation('ownership');
  const authorization = useAuthorization();
  const { teams, isLoading: areTeamsLoading } = useMyTeams();

  const labelOf = (selection: OwnerSelection): string => {
    switch (selection.ownerType) {
      case 'personal':
        return t('owner.personal');
      case 'org':
        return t('owner.org');
      case 'team':
        return (
          teams.find((team) => team.id === selection.teamId)?.name ??
          t('owner.unknownTeam')
        );
    }
  };

  const options: OwnerOption[] = manageableOwners(
    kind,
    authorization,
    teams,
  ).map((selection) => ({
    key: ownerKey(selection),
    selection,
    label: labelOf(selection),
  }));

  return {
    options,
    labelOf,
    canManage: (resource: OwnedResource) =>
      canManageResource(kind, resource, authorization, teams),
    isLoading: authorization.isLoading || areTeamsLoading,
  };
}
