import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowUp, Plus } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Card } from '@ayunis/ui/components/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import {
  allWorkspaces,
  canEditWorkspace,
  findPerson,
  linkedKnowledgeOf,
  personForRole,
  workspaceAccessOf,
  workspaceOwnKnowledge,
  workspaceOwnSkills,
} from '@/widgets/sharing-prototype/model/access';
import { VIEWER_WORKSPACE_ACCESS_LABEL } from '@/widgets/sharing-prototype/model/fixtures';
import {
  usePrototypeSkills,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeWorkspace,
  WorkspaceAccess,
} from '@/widgets/sharing-prototype/model/types';
import type {
  AddMode,
  AddTarget,
} from '@/pages/skill-sharing-prototype/model/types';
import { useDeleteWorkspaceWithConfirmation } from '@/pages/skill-sharing-prototype/model/useDeleteWorkspaceWithConfirmation';
import { useKnowledgeItems } from '@/widgets/sharing-prototype/model/prototype-knowledge';
import { AddKnowledgeDialog } from './AddKnowledgeDialog';
import { AddSkillsDialog } from './AddSkillsDialog';
import { ReadOnlyBadge } from './ReadOnlyBadge';
import { WorkspaceFavoriteButton } from './WorkspaceFavoriteButton';
import { WorkspaceMembersButton } from './WorkspaceMembersButton';
import { WorkspaceEditDialog } from './WorkspaceEditDialog';
import { WorkspaceMoreMenu } from './WorkspaceMoreMenu';
import { WorkspaceTransferDialog } from './WorkspaceTransferDialog';
import { WorkspaceKnowledgePanel } from './WorkspaceKnowledgePanel';
import {
  WorkspaceArtifactsPanel,
  WorkspaceChatsPanel,
  WorkspaceInstructionsPanel,
} from './WorkspaceSimpleTabs';
import { WorkspaceSkillsPanel } from './WorkspaceSkillsPanel';

interface OpenDialog {
  target: AddTarget;
  mode: AddMode;
}

export type PrototypeWorkspaceTab =
  'chats' | 'artifacts' | 'skills' | 'knowledge' | 'instructions';

function WorkspaceAccessBadge({
  access,
}: Readonly<{ access: WorkspaceAccess }>) {
  const label = VIEWER_WORKSPACE_ACCESS_LABEL[access];
  if (access === 'use') return <ReadOnlyBadge label={label} />;
  return <Badge variant="outline">{label}</Badge>;
}

function WorkspaceHero({
  workspace,
}: Readonly<{ workspace: PrototypeWorkspace }>) {
  return (
    <div className="flex items-start gap-3">
      <WorkspaceIcon icon={workspace.icon} color={workspace.color} size="lg" />
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold">{workspace.name}</h1>
        <p className="line-clamp-2 text-muted-foreground">
          {workspace.description}
        </p>
      </div>
    </div>
  );
}

function MockComposer({
  workspace,
}: Readonly<{ workspace: PrototypeWorkspace }>) {
  return (
    <Card className="gap-6 p-3">
      <p className="px-1 text-muted-foreground">
        Was möchten Sie in „{workspace.name}“ erledigen?
      </p>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon-sm" aria-label="Hinzufügen">
          <Plus />
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Claude Sonnet 4</span>
          <Button size="icon-sm" disabled aria-label="Senden">
            <ArrowUp />
          </Button>
        </div>
      </div>
    </Card>
  );
}

type WorkspaceDialog = 'add' | 'members' | 'transfer';

function WorkspaceManageActions({
  workspace,
  isOwner,
  initialDialog,
}: Readonly<{
  workspace: PrototypeWorkspace;
  isOwner: boolean;
  initialDialog?: WorkspaceDialog;
}>) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(
    initialDialog === 'transfer' && isOwner,
  );
  const navigate = useNavigate();
  const confirmDelete = useDeleteWorkspaceWithConfirmation(
    () => void navigate({ to: '/workspaces' }),
  );
  return (
    <>
      <WorkspaceMoreMenu
        isOwner={isOwner}
        onEdit={() => setIsEditOpen(true)}
        onTransfer={() => setIsTransferOpen(true)}
        onDelete={() => confirmDelete(workspace)}
      />
      <WorkspaceEditDialog
        workspace={workspace}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
      <WorkspaceTransferDialog
        key={isTransferOpen ? 'open' : 'closed'}
        workspace={workspace}
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
      />
    </>
  );
}

function WorkspaceHeaderActions({
  workspace,
  person,
  access,
  initialDialog,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  access: WorkspaceAccess;
  initialDialog?: WorkspaceDialog;
}>) {
  return (
    <div className="flex items-center gap-1">
      <WorkspaceFavoriteButton
        workspaceId={workspace.id}
        personId={person.id}
      />
      <WorkspaceMembersButton
        workspace={workspace}
        person={person}
        defaultOpen={initialDialog === 'members'}
      />
      {(access === 'owner' || access === 'manage') && (
        <WorkspaceManageActions
          workspace={workspace}
          isOwner={access === 'owner'}
          initialDialog={initialDialog}
        />
      )}
    </div>
  );
}

function useTabCounts(workspace: PrototypeWorkspace) {
  const skills = usePrototypeSkills();
  const knowledgeItems = useKnowledgeItems();
  const state = usePrototypeState();
  const linkedSkillIds = (state.linkedSkills[workspace.id] ?? []).map(
    (link) => link.skillId,
  );
  const linkedSkills = skills.filter((skill) =>
    linkedSkillIds.includes(skill.id),
  );
  const linkedKnowledge = linkedKnowledgeOf(
    workspace.id,
    state.linkedKnowledge,
    knowledgeItems,
  );
  return {
    chats: workspace.chats.length,
    artifacts: workspace.artifacts.length,
    skills:
      workspaceOwnSkills(skills, workspace.id).length + linkedSkills.length,
    knowledge:
      workspaceOwnKnowledge(workspace, state.createdKnowledge).length +
      linkedKnowledge.length,
  };
}

function WorkspaceTabList({
  counts,
}: Readonly<{ counts: ReturnType<typeof useTabCounts> }>) {
  return (
    <TabsList>
      <TabsTrigger value="chats">
        Ihre Chats <Badge variant="secondary">{counts.chats}</Badge>
      </TabsTrigger>
      <TabsTrigger value="artifacts">
        Erstellte Inhalte <Badge variant="secondary">{counts.artifacts}</Badge>
      </TabsTrigger>
      <TabsTrigger value="skills">
        Fähigkeiten <Badge variant="secondary">{counts.skills}</Badge>
      </TabsTrigger>
      <TabsTrigger value="knowledge">
        Wissen <Badge variant="secondary">{counts.knowledge}</Badge>
      </TabsTrigger>
      <TabsTrigger value="instructions">Anweisungen</TabsTrigger>
    </TabsList>
  );
}

function WorkspaceTabs({
  workspace,
  person,
  tab,
  onTabChange,
  onAdd,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  tab: PrototypeWorkspaceTab;
  onTabChange: (tab: PrototypeWorkspaceTab) => void;
  onAdd: (target: AddTarget, mode: AddMode) => void;
}>) {
  const counts = useTabCounts(workspace);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as PrototypeWorkspaceTab)}
    >
      <WorkspaceTabList counts={counts} />
      <TabsContent value="chats" className="pt-4">
        <WorkspaceChatsPanel workspace={workspace} />
      </TabsContent>
      <TabsContent value="artifacts" className="pt-4">
        <WorkspaceArtifactsPanel workspace={workspace} />
      </TabsContent>
      <TabsContent value="skills" className="pt-4">
        <WorkspaceSkillsPanel
          workspace={workspace}
          person={person}
          onAdd={(mode) => onAdd('skills', mode)}
        />
      </TabsContent>
      <TabsContent value="knowledge" className="pt-4">
        <WorkspaceKnowledgePanel
          workspace={workspace}
          person={person}
          onAdd={(mode) => onAdd('knowledge', mode)}
        />
      </TabsContent>
      <TabsContent value="instructions" className="pt-4">
        <WorkspaceInstructionsPanel
          workspace={workspace}
          canEdit={canEditWorkspace(workspace, person)}
        />
      </TabsContent>
    </Tabs>
  );
}

function WorkspaceContent({
  workspace,
  person,
  access,
  tab,
  initialDialog,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  access: WorkspaceAccess;
  tab: PrototypeWorkspaceTab;
  initialDialog?: WorkspaceDialog;
}>) {
  const navigate = useNavigate();
  const canEdit = canEditWorkspace(workspace, person);
  const [openDialog, setOpenDialog] = useState<OpenDialog | null>(
    initialDialog === 'add' && canEdit
      ? { target: 'skills', mode: 'link' }
      : null,
  );
  const skillsMode = openDialog?.target === 'skills' ? openDialog.mode : null;
  const knowledgeMode =
    openDialog?.target === 'knowledge' ? openDialog.mode : null;

  return (
    <ContentAreaLayout
      contentHeader={
        <ContentAreaHeader
          breadcrumbs={[
            { label: 'Arbeitsbereiche', href: '/workspaces' },
            { label: workspace.name },
          ]}
          badge={<WorkspaceAccessBadge access={access} />}
          action={
            <WorkspaceHeaderActions
              workspace={workspace}
              person={person}
              access={access}
              initialDialog={initialDialog}
            />
          }
        />
      }
      contentArea={
        <div className="space-y-6">
          <WorkspaceHero workspace={workspace} />
          <MockComposer workspace={workspace} />
          <WorkspaceTabs
            workspace={workspace}
            person={person}
            tab={tab}
            onTabChange={(next) =>
              void navigate({
                to: '/workspaces/$workspaceId',
                params: { workspaceId: workspace.id },
                search: { tab: next },
              })
            }
            onAdd={(target, mode) => setOpenDialog({ target, mode })}
          />
          <AddSkillsDialog
            key={`skills-${skillsMode ?? 'closed'}`}
            workspace={workspace}
            person={person}
            mode={skillsMode}
            onClose={() => setOpenDialog(null)}
          />
          <AddKnowledgeDialog
            key={`knowledge-${knowledgeMode ?? 'closed'}`}
            workspace={workspace}
            person={person}
            mode={knowledgeMode}
            onClose={() => setOpenDialog(null)}
          />
        </div>
      }
    />
  );
}

function NoAccess({ workspace }: Readonly<{ workspace?: PrototypeWorkspace }>) {
  const title = workspace
    ? `Kein Zugriff auf „${workspace.name}“`
    : 'Diesen Arbeitsbereich gibt es im Prototyp nicht';
  const description = workspace
    ? `Der Arbeitsbereich gehört ${findPerson(workspace.ownerId).name}. Bitten Sie um eine Einladung.`
    : 'Öffnen Sie einen Arbeitsbereich aus der Liste.';

  return (
    <ContentAreaLayout
      contentHeader={
        <ContentAreaHeader
          breadcrumbs={[{ label: 'Arbeitsbereiche', href: '/workspaces' }]}
        />
      }
      contentArea={<EmptyState title={title} description={description} />}
    />
  );
}

export function PrototypeWorkspacePage({
  workspaceId,
  tab,
  dialog,
}: Readonly<{
  workspaceId: string;
  tab: PrototypeWorkspaceTab;
  dialog?: WorkspaceDialog;
}>) {
  const { role } = usePrototypeState();
  const person = personForRole(role);
  const workspace = allWorkspaces().find(
    (candidate) => candidate.id === workspaceId,
  );
  const access = workspace ? workspaceAccessOf(workspace, person) : null;

  return (
    <AppLayout>
      {workspace && access ? (
        <WorkspaceContent
          key={`${workspace.id}-${role}-${dialog ?? ''}`}
          workspace={workspace}
          person={person}
          access={access}
          tab={tab}
          initialDialog={dialog}
        />
      ) : (
        <NoAccess workspace={workspace} />
      )}
    </AppLayout>
  );
}
