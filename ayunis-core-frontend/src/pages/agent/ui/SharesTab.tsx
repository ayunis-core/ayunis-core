import { useTranslation } from 'react-i18next';
import { Switch } from '@/shared/ui/shadcn/switch';
import { useConfirmation } from '@/widgets/confirmation-modal';
import type {
  ShareResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ShareResponseDtoScopeType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useCreateShare, useDeleteShare } from '../api';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemActions,
} from '@/shared/ui/shadcn/item';

interface SharesTabProps {
  agentId: string;
  shares: ShareResponseDto[];
  userTeams: TeamResponseDto[];
}

export default function SharesTab({
  agentId,
  shares,
  userTeams,
}: SharesTabProps) {
  const { t } = useTranslation('agent');
  const { confirm } = useConfirmation();
  const { createShare, isCreating } = useCreateShare(agentId);
  const { deleteShare } = useDeleteShare(agentId);

  // Check if organization share exists
  const organizationShare = shares.find(
    (share) => share.scopeType === ShareResponseDtoScopeType.org,
  );

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // Show create confirmation
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
      // Show delete confirmation
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
            onCheckedChange={handleToggleChange}
            disabled={isCreating}
          />
        </ItemActions>
      </Item>

      {userTeams.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('shares.teams.title')}</h3>
          {userTeams.map((team) => (
            <Item key={team.id} variant="outline">
              <ItemContent>
                <ItemTitle>{team.name}</ItemTitle>
                <ItemDescription>
                  {t('shares.teams.description')}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </div>
      )}
    </div>
  );
}
