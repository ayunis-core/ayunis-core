import { useTranslation } from 'react-i18next';
import { Switch } from '@ayunis/ui/components/switch';
import { useConfirmation } from '@/widgets/confirmation-modal';
import type {
  MyTeamResponseDto,
  ShareResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ShareResponseDtoScopeType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useCreateShare } from '@/widgets/shares-tab/api/useCreateShare';
import { useDeleteShare } from '@/widgets/shares-tab/api/useDeleteShare';
import { useMyPermissions } from '@/features/permissions';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemActions,
} from '@ayunis/ui/components/item';

type EntityType = 'skill' | 'knowledge_base';

interface SharesTabProps {
  entityType: EntityType;
  entityId: string;
  shares: ShareResponseDto[];
  userTeams: MyTeamResponseDto[];
}

export default function SharesTab({
  entityType,
  entityId,
  shares,
  userTeams,
}: Readonly<SharesTabProps>) {
  const translationNsMap: Record<EntityType, string> = {
    skill: 'skill',
    knowledge_base: 'knowledge-bases',
  };
  const translationNs = translationNsMap[entityType];
  const { t } = useTranslation(translationNs);
  const { confirm } = useConfirmation();
  const { createShare, isCreating } = useCreateShare(entityType, entityId);
  const { deleteShare, isDeleting } = useDeleteShare(entityType, entityId);
  const { can } = useMyPermissions();
  // Sharing is permissioned per audience and the backend 403s the rest;
  // disable the switches the member cannot use so it's clear.
  const canShareWithOrg = can(
    entityType === 'skill'
      ? 'share_skills_with_org'
      : 'share_knowledge_bases_with_org',
  );
  const teamSharePermission =
    entityType === 'skill'
      ? 'share_skills_with_teams'
      : 'share_knowledge_bases_with_teams';
  // A team role can grant team sharing (team admins always may), so each
  // team's own effective permissions decide its switch.
  const canShareWithTeam = (team: MyTeamResponseDto) =>
    team.permissions.includes(teamSharePermission);

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
    // eslint-disable-next-line sonarjs/no-selector-parameter -- Required by Switch component's onCheckedChange callback signature
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
    // eslint-disable-next-line sonarjs/no-selector-parameter -- Required by Switch component's onCheckedChange callback signature
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
            disabled={isCreating || isDeleting || !canShareWithOrg}
            data-testid="shares-org-switch"
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
                    disabled={
                      isCreating || isDeleting || !canShareWithTeam(team)
                    }
                    data-testid={`shares-team-switch-${team.id}`}
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
