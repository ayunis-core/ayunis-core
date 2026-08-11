import { Link } from '@tanstack/react-router';
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
        {workspace.description && (
          <ItemDescription className="line-clamp-1">
            {workspace.description}
          </ItemDescription>
        )}
      </ItemContent>
      <ItemActions className="relative">
        <WorkspacePinButton
          workspaceId={workspace.id}
          isPinned={workspace.isPinned}
        />
      </ItemActions>
    </Item>
  );
}
