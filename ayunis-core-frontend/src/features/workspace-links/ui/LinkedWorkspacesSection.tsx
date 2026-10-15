import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ListSection } from '@/shared/ui/list-section/ListSection';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import { useLinkedWorkspaces } from '@/features/workspace-links/api/useLinkedWorkspaces';
import type { LinkKind } from '@/features/workspace-links/model/types';

export function LinkedWorkspacesSection({
  kind,
  id,
}: Readonly<{ kind: LinkKind; id: string }>) {
  const { t } = useTranslation('workspace');
  const { total, workspaces } = useLinkedWorkspaces(kind, id);
  if (total === 0) return null;
  const hiddenCount = total - workspaces.length;

  return (
    <ListSection
      title={t('links.linkedWorkspaces.title')}
      count={total}
      testId="linked-workspaces"
    >
      {workspaces.map((workspace) => (
        <Item key={workspace.id} asChild variant="outline" size="sm">
          <Link
            to="/workspaces/$workspaceId"
            params={{ workspaceId: workspace.id }}
            search={{ tab: kind === 'skill' ? 'skills' : 'knowledge' }}
          >
            <ItemMedia>
              <WorkspaceIcon icon={workspace.icon} color={workspace.color} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{workspace.name}</ItemTitle>
            </ItemContent>
            {workspace.linkedBy && (
              <ItemActions>
                <ItemDescription>
                  {t('links.linkedWorkspaces.by', {
                    name: workspace.linkedBy.name,
                  })}
                </ItemDescription>
              </ItemActions>
            )}
          </Link>
        </Item>
      ))}
      {hiddenCount > 0 && (
        <Item variant="muted" size="sm" data-testid="linked-workspaces-hidden">
          <ItemContent>
            <ItemDescription>
              {t('links.linkedWorkspaces.hidden', { count: hiddenCount })}
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
    </ListSection>
  );
}
