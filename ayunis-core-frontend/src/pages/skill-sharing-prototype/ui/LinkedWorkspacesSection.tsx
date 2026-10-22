import { Link } from '@tanstack/react-router';
import { Item, ItemContent, ItemDescription } from '@ayunis/ui/components/item';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import {
  allWorkspaces,
  findPerson,
  workspacesOf,
} from '@/widgets/sharing-prototype/model/access';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  ResourceKind,
} from '@/widgets/sharing-prototype/model/types';
import { SkillPanelSection } from './SkillPanelSection';

function hiddenLinksText(count: number, hasVisible: boolean): string {
  if (hasVisible) {
    return count === 1
      ? 'Außerdem in 1 weiteren Arbeitsbereich verknüpft'
      : `Außerdem in ${count} weiteren Arbeitsbereichen verknüpft`;
  }
  return count === 1
    ? 'In 1 Arbeitsbereich verknüpft, den Sie nicht öffnen können'
    : `In ${count} Arbeitsbereichen verknüpft, die Sie nicht öffnen können`;
}

function useLinks(resource: ResourceKind, itemId: string) {
  const { linkedSkills, linkedKnowledge } = usePrototypeState();
  return allWorkspaces().flatMap((workspace) => {
    const linkedBy =
      resource === 'skill'
        ? (linkedSkills[workspace.id] ?? []).find(
            (link) => link.skillId === itemId,
          )?.linkedBy
        : (linkedKnowledge[workspace.id] ?? []).find(
            (link) => link.knowledgeId === itemId,
          )?.linkedBy;
    return linkedBy ? [{ workspace, linkedBy }] : [];
  });
}

export function LinkedWorkspacesSection({
  resource,
  itemId,
  person,
}: Readonly<{ resource: ResourceKind; itemId: string; person: Person }>) {
  const links = useLinks(resource, itemId);
  if (links.length === 0) return null;
  const openableIds = new Set(workspacesOf(person).map(({ id }) => id));
  const visible = links.filter(({ workspace }) =>
    openableIds.has(workspace.id),
  );
  const hiddenCount = links.length - visible.length;

  return (
    <SkillPanelSection
      title="Verknüpft in Arbeitsbereichen"
      count={links.length}
    >
      {visible.map(({ workspace, linkedBy }) => (
        <Link
          key={workspace.id}
          to="/workspaces/$workspaceId"
          params={{ workspaceId: workspace.id }}
          search={{ tab: resource === 'skill' ? 'skills' : 'knowledge' }}
          className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm hover:bg-accent/50"
        >
          <WorkspaceIcon icon={workspace.icon} color={workspace.color} />
          <span className="font-medium">{workspace.name}</span>
          <span className="ml-auto text-muted-foreground">
            von {findPerson(linkedBy).name}
          </span>
        </Link>
      ))}
      {hiddenCount > 0 && (
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemDescription>
              {hiddenLinksText(hiddenCount, visible.length > 0)}
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
    </SkillPanelSection>
  );
}
