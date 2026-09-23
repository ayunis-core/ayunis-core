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
import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
} from '@/features/feature-toggles';
import { TOUR_TARGET } from '@/widgets/onboarding';
import type { Workspace } from '@/features/workspaces';
import { WorkspacePinButton } from './WorkspacePinButton';

interface WorkspaceRowProps {
  workspace: Workspace;
  pinTourTarget?: boolean;
}

export function WorkspaceRow({
  workspace,
  pinTourTarget = false,
}: Readonly<WorkspaceRowProps>) {
  const { t } = useTranslation('workspaces');
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const counts = [
    skillsEnabled
      ? t('page.skillCount', { count: workspace.skillCount ?? 0 })
      : null,
    knowledgeBasesEnabled
      ? t('page.knowledgeBaseCount', {
          count: workspace.knowledgeBaseCount ?? 0,
        })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Item
      variant="outline"
      className="relative"
      data-testid={`workspace-${workspace.id}`}
    >
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
        {counts && (
          <ItemDescription className="line-clamp-1">{counts}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions className="relative">
        <WorkspacePinButton
          workspaceId={workspace.id}
          tourTarget={pinTourTarget ? TOUR_TARGET.favoriteWorkspace : undefined}
        />
      </ItemActions>
    </Item>
  );
}
