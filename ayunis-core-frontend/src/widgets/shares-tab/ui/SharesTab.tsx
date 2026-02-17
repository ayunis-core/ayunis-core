import { useTranslation } from 'react-i18next';
import { Switch } from '@/shared/ui/shadcn/switch';
import { useConfirmation } from '@/widgets/confirmation-modal';
import type {
  ShareResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ShareResponseDtoScopeType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useCreateShare } from '../api/useCreateShare';
import { useDeleteShare } from '../api/useDeleteShare';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemActions,
} from '@/shared/ui/shadcn/item';

type EntityType = 'agent' | 'skill';

interface SharesTabProps {
  entityType: EntityType;
  entityId: string;
  shares: ShareResponseDto[];
  userTeams: TeamResponseDto[];
}

export default function SharesTab({
  entityType,
  entityId,
  shares,
  userTeams,
}: SharesTabProps) {
  const translationNs = entityType === 'agent' ? 'agent' : 'skill';
  const { t } = useTranslation(translationNs);
  const { confirm } = useConfirmation();
  const { createShare, isCreating } = useCreateShare(entityType, entityId);
  const { deleteShare, isDeleting } = useDeleteShare(entityType, entityId);

  // Check if organization share exists
  const organizationShare = shares.find(
    (share) => share.scopeType === ShareResponseDtoScopeType.org,
  );

  // Helper to find team share for a specific team
  const getTeamShare = (teamId: string) =>
    shares.find(
      (share) =>
        share.scopeType === ShareResponseDtoScopeType.team &&
        share.teamId === teamId,
    );

  const handleOrgToggleChange = (checked: boolean) => {
    if (checked) {
      confirm({
        title: t('shares.create.title'),
        description: t('shares.create.description'),
        confirmText: t('shares.create.confirm'),
        cancelText: t('shares.create.cancel'),
        onConfirm: () => {
          createShare();
        },
      });
    } else {
      if (organizationShare) {
        confirm({
          title: t('shares.delete.title'),
          description: t('shares.delete.description'),
          confirmText: t('shares.delete.confirm'),
          cancelText: t('shares.delete.cancel'),
          variant: 'destructive',
          onConfirm: () => {
            deleteShare(organizationShare.id);
          },
        });
      }
    }
  };

  const handleTeamToggleChange = (
    teamId: string,
    teamName: string,
    checked: boolean,
  ) => {
    if (checked) {
      confirm({
        title: t('shares.teams.create.title'),
        description: t('shares.teams.create.description', { teamName }),
        confirmText: t('shares.teams.create.confirm'),
        cancelText: t('shares.teams.create.cancel'),
        onConfirm: () => {
          createShare(teamId);
        },
      });
    } else {
      const teamShare = getTeamShare(teamId);
      if (teamShare) {
        confirm({
          title: t('shares.teams.delete.title'),
          description: t('shares.teams.delete.description', { teamName }),
          confirmText: t('shares.teams.delete.confirm'),
          cancelText: t('shares.teams.delete.cancel'),
          variant: 'destructive',
          onConfirm: () => {
            deleteShare(teamShare.id);
          },
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>{t('shares.org.title')}</ItemTitle>
          <ItemDescription>{t('shares.org.descriptionOn')}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Switch
            checked={!!organizationShare}
            onCheckedChange={handleOrgToggleChange}
            disabled={isCreating || isDeleting}
          />
        </ItemActions>
      </Item>

      {userTeams.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('shares.teams.title')}</h3>
          {userTeams.map((team) => {
            const teamShare = getTeamShare(team.id);
            return (
              <Item key={team.id} variant="outline">
                <ItemContent>
                  <ItemTitle>{team.name}</ItemTitle>
                  <ItemDescription>
                    {t('shares.teams.description')}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={!!teamShare}
                    onCheckedChange={(checked) =>
                      handleTeamToggleChange(team.id, team.name, checked)
                    }
                    disabled={isCreating || isDeleting}
                  />
                </ItemActions>
              </Item>
            );
          })}
        </div>
      )}
    </div>
  );
}
