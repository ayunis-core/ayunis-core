import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import type { Workspace } from '@/features/workspaces';
import { WorkspacePinButton } from './WorkspacePinButton';

interface WorkspaceCardProps {
  workspace: Workspace;
}

export function WorkspaceCard({ workspace }: Readonly<WorkspaceCardProps>) {
  const { t } = useTranslation('workspaces');
  return (
    // The pin button is a sibling of the link, not a descendant: a <button>
    // inside an <a> is invalid HTML and breaks keyboard activation.
    <div className="relative h-full">
      <Link
        to="/workspaces/$workspaceId"
        params={{ workspaceId: workspace.id }}
        className="block h-full"
      >
        <Card className="h-full transition-colors hover:border-brand">
          <CardHeader>
            <div className="flex items-center gap-2 pr-10">
              <WorkspaceIcon
                icon={workspace.icon}
                color={workspace.color}
                size="md"
              />
              <CardTitle className="truncate">{workspace.name}</CardTitle>
            </div>
            <CardDescription className="line-clamp-2 min-h-10">
              {workspace.description}
            </CardDescription>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            {t('page.chatCount', { count: workspace.chatCount ?? 0 })}
          </CardFooter>
        </Card>
      </Link>
      <div className="absolute top-4 right-4">
        <WorkspacePinButton
          workspaceId={workspace.id}
          isPinned={workspace.isPinned}
        />
      </div>
    </div>
  );
}
