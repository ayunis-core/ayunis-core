import { Link } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import {
  personForRole,
  workspaceAccessOf,
  workspaceMemberIds,
  workspaceOwnSkills,
  workspacesOf,
} from '@/widgets/sharing-prototype/model/access';
import { VIEWER_WORKSPACE_ACCESS_LABEL } from '@/widgets/sharing-prototype/model/fixtures';
import {
  useHasPermission,
  usePrototypeSkills,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';
import { WorkspaceFavoriteButton } from './WorkspaceFavoriteButton';

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function WorkspaceListRow({
  workspace,
  person,
}: Readonly<{ workspace: PrototypeWorkspace; person: Person }>) {
  const skills = usePrototypeSkills();
  const { linkedSkills } = usePrototypeState();
  const skillCount =
    workspaceOwnSkills(skills, workspace.id).length +
    (linkedSkills[workspace.id] ?? []).length;
  const access = workspaceAccessOf(workspace, person) ?? 'use';
  const counts = [
    plural(skillCount, 'Fähigkeit', 'Fähigkeiten'),
    plural(workspaceMemberIds(workspace).length, 'Mitglied', 'Mitglieder'),
  ].join(' · ');

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
        <ItemTitle>
          <Link
            to="/workspaces/$workspaceId"
            params={{ workspaceId: workspace.id }}
            className="after:absolute after:inset-0"
          >
            {workspace.name}
          </Link>
        </ItemTitle>
        <ItemDescription className="line-clamp-1">{counts}</ItemDescription>
      </ItemContent>
      <ItemActions className="relative">
        <span className="text-sm text-muted-foreground">
          {VIEWER_WORKSPACE_ACCESS_LABEL[access]}
        </span>
        <WorkspaceFavoriteButton
          workspaceId={workspace.id}
          personId={person.id}
        />
      </ItemActions>
    </Item>
  );
}

export function PrototypeWorkspacesPage() {
  const { role } = usePrototypeState();
  const mayCreate = useHasPermission(role, 'create_workspaces');
  const person = personForRole(role);
  const workspaces = workspacesOf(person);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: 'Arbeitsbereiche' }]}
            action={
              mayCreate && <Button size="sm">Arbeitsbereich hinzufügen</Button>
            }
          />
        }
        contentArea={
          workspaces.length === 0 ? (
            <EmptyState
              title="Noch keine Arbeitsbereiche"
              description="Legen Sie einen an, oder lassen Sie sich zu einem einladen."
            />
          ) : (
            <ItemGroup className="gap-2">
              {workspaces.map((workspace) => (
                <WorkspaceListRow
                  key={workspace.id}
                  workspace={workspace}
                  person={person}
                />
              ))}
            </ItemGroup>
          )
        }
      />
    </AppLayout>
  );
}
