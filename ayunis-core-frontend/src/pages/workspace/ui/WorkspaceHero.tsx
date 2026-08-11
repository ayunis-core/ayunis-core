import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import type { Workspace } from '@/features/workspaces';

interface WorkspaceHeroProps {
  workspace: Workspace;
}

export function WorkspaceHero({ workspace }: Readonly<WorkspaceHeroProps>) {
  return (
    <div className="flex items-start gap-3">
      <WorkspaceIcon icon={workspace.icon} color={workspace.color} size="lg" />
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        {workspace.description && (
          <p className="line-clamp-2 text-muted-foreground">
            {workspace.description}
          </p>
        )}
      </div>
    </div>
  );
}
