import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Share2,
  Star,
  Settings2,
  Lock,
  Building2,
  Users,
  Plus,
} from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { MockChatInput } from './MockChatInput';
import {
  TabTriggerWithCount,
  ChatsTab,
  InstructionsTab,
  ListTab,
  DocumentsTab,
  GeneratedDocumentsTab,
} from './OverviewTabs';
import {
  AddProjectItemsDialog,
  type AddItemKind,
} from './AddProjectItemsDialog';
import { KnowledgeBaseRows } from './KnowledgeBaseRows';
import { ShareProjectDialog, ProjectSettingsDialog } from '@/entities/project';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';

import {
  ProjectIcon,
  SKILL_DESCRIPTIONS,
  addDocumentToProject,
  addChatToProject,
  removeSkillFromProject,
  removeKnowledgeBaseFromProject,
  removeDocumentFromProject,
  toggleGeneratedDocumentShared,
  removeGeneratedDocument,
  removeChatFromProject,
  toggleProjectStarred,
  CURRENT_USER,
  FEATURES,
  orgPeople,
  type MockProject,
} from '@/entities/project';

interface ProjectOverviewPageProps {
  project: MockProject;
  initialTab?: string;
}

export function ProjectOverviewPage({
  project,
  initialTab,
}: Readonly<ProjectOverviewPageProps>) {
  const navigate = useNavigate();
  const [addKind, setAddKind] = useState<AddItemKind>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isOwner = project.ownerId === CURRENT_USER.id;
  const canContribute = isOwner || project.allowMemberContent;
  const canChat = isOwner || project.allowPrivateChats;
  const canShare = isOwner || (project.allowContentSharing ?? true);

  function handleNewChat() {
    const chat = { id: crypto.randomUUID(), title: 'Neuer Chat', messages: [] };
    addChatToProject(project.id, chat);
    void navigate({
      to: '/projects/$projectId/chats/$chatId',
      params: { projectId: project.id, chatId: chat.id },
    });
  }

  function handleAddDocument() {
    addDocumentToProject(project.id, {
      id: crypto.randomUUID(),
      name: `Dokument ${project.documents.length + 1}.pdf`,
    });
  }

  const headerAction = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => toggleProjectStarred(project.id)}
            aria-label={project.starred ? 'Nicht mehr anheften' : 'Anheften'}
          >
            <Star
              className={cn(
                'size-4',
                project.starred
                  ? 'fill-brand text-brand'
                  : 'text-muted-foreground',
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {project.starred ? 'Nicht mehr anheften' : 'Anheften'}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
            aria-label="Projekteinstellungen"
          >
            <Settings2 className="size-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Projekteinstellungen</TooltipContent>
      </Tooltip>
      {FEATURES.sharing && (
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 /> Teilen
        </Button>
      )}
    </>
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: 'Projekte', href: '/projects' },
              { label: project.name },
            ]}
            action={headerAction}
          />
        }
        contentArea={
          <div className="flex flex-col gap-6 pt-2">
            <div className="flex items-start gap-3">
              <ProjectIcon
                icon={project.icon}
                color={project.color}
                size="lg"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="truncate text-xl font-semibold">
                  {project.name}
                </h1>
                {project.instructions && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.instructions}
                  </p>
                )}
                <OriginLine project={project} />
              </div>
            </div>

            {canChat ? (
              <MockChatInput onSend={handleNewChat} />
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
                Private Chats sind in diesem Projekt deaktiviert.
              </p>
            )}

            <Tabs defaultValue={initialTab ?? 'chats'}>
              <TabsList>
                <TabTriggerWithCount
                  value="chats"
                  label="Ihre Chats"
                  count={project.chats.length}
                />
                {FEATURES.artifacts && (
                  <TabTriggerWithCount
                    value="docs"
                    label="Erstellte Inhalte"
                    count={(project.generatedDocuments ?? []).length}
                  />
                )}
                {FEATURES.skillsAndKnowledge && (
                  <>
                    <TabTriggerWithCount
                      value="kb"
                      label="Wissen"
                      count={
                        project.knowledgeBases.length + project.documents.length
                      }
                    />
                    <TabTriggerWithCount
                      value="skills"
                      label="Fähigkeiten"
                      count={project.skills.length}
                    />
                    <TabsTrigger value="instructions">Anweisungen</TabsTrigger>
                  </>
                )}
              </TabsList>

              <TabsContent value="chats" className="mt-4">
                <ChatsTab
                  project={project}
                  onOpenChat={(chatId) =>
                    void navigate({
                      to: '/projects/$projectId/chats/$chatId',
                      params: { projectId: project.id, chatId },
                    })
                  }
                  onRemoveChat={(chatId) =>
                    removeChatFromProject(project.id, chatId)
                  }
                />
              </TabsContent>
              <TabsContent value="docs" className="mt-4">
                <GeneratedDocumentsTab
                  project={project}
                  onOpenChat={(chatId, artifactId) =>
                    void navigate({
                      to: '/projects/$projectId/chats/$chatId',
                      params: { projectId: project.id, chatId },
                      search: { artifact: artifactId },
                    })
                  }
                  onToggleShared={
                    canShare
                      ? (id) => toggleGeneratedDocumentShared(project.id, id)
                      : undefined
                  }
                  onRemove={(id) => removeGeneratedDocument(project.id, id)}
                />
              </TabsContent>
              <TabsContent value="kb" className="mt-4">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Wissensdatenbanken
                    </h3>
                    <div className="flex flex-col gap-3">
                      {canContribute && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="self-start"
                          onClick={() => setAddKind('kb')}
                        >
                          <Plus /> Wissensdatenbank hinzufügen
                        </Button>
                      )}
                      {project.knowledgeBases.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          Noch keine Wissensdatenbanken eingebunden.
                        </p>
                      ) : (
                        <KnowledgeBaseRows
                          knowledgeBases={project.knowledgeBases}
                          onRemove={
                            canContribute
                              ? (id) =>
                                  removeKnowledgeBaseFromProject(project.id, id)
                              : undefined
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Dateien
                    </h3>
                    <DocumentsTab
                      project={project}
                      onAdd={handleAddDocument}
                      onRemove={(id) =>
                        removeDocumentFromProject(project.id, id)
                      }
                      canManage={canContribute}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="skills" className="mt-4">
                <ListTab
                  addLabel="Fähigkeit hinzufügen"
                  onAdd={() => setAddKind('skills')}
                  onRemove={(id) => removeSkillFromProject(project.id, id)}
                  emptyText="Noch keine Fähigkeiten in diesem Projekt."
                  canManage={canContribute}
                  rows={project.skills.map((s) => ({
                    id: s.id,
                    title: s.name,
                    description: SKILL_DESCRIPTIONS[s.name],
                  }))}
                />
              </TabsContent>
              <TabsContent value="instructions" className="mt-4">
                <InstructionsTab project={project} canManage={canContribute} />
              </TabsContent>
            </Tabs>
          </div>
        }
      />

      <AddProjectItemsDialog
        project={project}
        kind={addKind}
        onClose={() => setAddKind(null)}
      />

      <ShareProjectDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        project={project}
      />

      <ProjectSettingsDialog
        key={`${project.id}-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
      />
    </AppLayout>
  );
}

function OriginLine({ project }: Readonly<{ project: MockProject }>) {
  const isMine = project.ownerId === CURRENT_USER.id;
  const ownerName =
    project.collaborators.find((c) => c.id === project.ownerId)?.name ??
    orgPeople.find((p) => p.id === project.ownerId)?.name;
  const creator = isMine
    ? 'Von Ihnen erstellt'
    : `Erstellt von ${ownerName ?? 'Unbekannt'}`;

  let Icon = Lock;
  let scope = 'Privat';
  if (project.visibility === 'org') {
    Icon = Building2;
    scope = 'Organisation';
  } else if (project.teams.length > 0) {
    Icon = Users;
    scope = `Team ${project.teams.map((t) => t.name).join(', ')}`;
  } else if (project.collaborators.length > 1) {
    Icon = Share2;
    scope = isMine
      ? `Mit ${project.collaborators.length - 1} Personen geteilt`
      : 'Mit Ihnen geteilt';
  }

  return (
    <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
      {creator}
      <span aria-hidden>·</span>
      <Icon className="size-3.5 shrink-0" />
      {scope}
    </p>
  );
}
