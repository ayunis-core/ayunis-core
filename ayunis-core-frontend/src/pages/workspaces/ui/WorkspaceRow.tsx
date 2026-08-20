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
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import type { Workspace } from '@/features/workspaces';
import { WorkspacePinButton } from './WorkspacePinButton';

interface WorkspaceRowProps {
  workspace: Workspace;
}

export function WorkspaceRow({ workspace }: Readonly<WorkspaceRowProps>) {
  const { t } = useTranslation('workspaces');
  return (
    <Item variant="outline" className="relative">
      <ItemMedia>
        <WorkspaceIcon
          icon={workspace.icon}
          color={workspace.color}
          size="md"
        />
      </ItemMedia>
      <ItemContent>
        {/* The link stretches over the whole row via after:inset-0; the pin
            button sits on its own stacking context so it stays clickable. */}
        <ItemTitle>
          <Link
            to="/workspaces/$workspaceId"
            params={{ workspaceId: workspace.id }}
            className="after:absolute after:inset-0"
          >
            {workspace.name}
          </Link>
        </ItemTitle>
        <ItemDescription className="line-clamp-1">
          {[
            t('page.chatCount', { count: workspace.chatCount ?? 0 }),
            workspace.description,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="relative">
        {workspace.isOwner ? (
          <WorkspacePinButton workspaceId={workspace.id} />
        ) : null}
      </ItemActions>
    </Item>
  );
}
