import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useWorkspaceInvitations } from '@/features/workspaces';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';

export function WorkspaceInvitations() {
  const { t } = useTranslation('workspaces');
  const { invitations, accept, decline } = useWorkspaceInvitations();

  if (invitations.length === 0) return null;

  return (
    <section className="space-y-2" data-testid="workspace-invitations">
      <h2 className="text-lg font-semibold">{t('invitations.title')}</h2>
      {invitations.map(({ workspace, accessLevel }) => (
        <Item key={workspace.id} variant="outline">
          <ItemMedia>
            <WorkspaceIcon
              icon={workspace.icon}
              color={workspace.color}
              size="md"
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{workspace.name}</ItemTitle>
            <ItemDescription>
              {t('invitations.description')}{' '}
              <Badge variant="secondary">
                {t(`sharing.accessLevels.${accessLevel}.label`)}
              </Badge>
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="outline" onClick={() => decline(workspace.id)}>
              {t('invitations.decline')}
            </Button>
            <Button
              data-testid={`workspace-invitation-accept-${workspace.id}`}
              onClick={() => accept(workspace.id)}
            >
              {t('invitations.accept')}
            </Button>
          </ItemActions>
        </Item>
      ))}
    </section>
  );
}
