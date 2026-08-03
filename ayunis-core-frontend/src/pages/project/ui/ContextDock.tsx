import { Fragment, useState, type ReactNode } from 'react';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';
import { X, Plus, Brain, Upload, ChevronLeft } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import {
  CURRENT_USER,
  removeGeneratedDocument,
  toggleGeneratedDocumentShared,
  type MockProject,
  type ProjectDocument,
} from '@/entities/project';
import { KnowledgeBaseRows } from './KnowledgeBaseRows';
import { GeneratedContentRows } from './GeneratedContentRows';
import { MockWidgetView } from './MockWidgetView';
import { PANELS, PANEL_ORDER, type PanelKey } from '../model/panels';

export function ResizeHandle({
  orientation,
}: Readonly<{ orientation: 'col' | 'row' }>) {
  if (orientation === 'col') {
    return (
      <PanelResizeHandle className="group flex w-2 shrink-0 items-stretch justify-center bg-transparent">
        <div className="w-px bg-border transition-all group-hover:w-0.5 group-hover:bg-brand group-hover:shadow-sm" />
      </PanelResizeHandle>
    );
  }
  return (
    <PanelResizeHandle className="group flex h-2 shrink-0 items-center bg-transparent">
      <div className="h-px w-full bg-border transition-all group-hover:h-0.5 group-hover:bg-brand group-hover:shadow-sm" />
    </PanelResizeHandle>
  );
}

interface ContextDockProps {
  project: MockProject;
  chatId: string;
  openPanels: PanelKey[];
  onClosePanel: (key: PanelKey) => void;
  onAddSkills: () => void;
  onAddKnowledgeBase: () => void;
  onUploadFile: () => void;
  canAdd: boolean;
  initialArtifactId?: string;
}

export function ContextDock({
  project,
  chatId,
  openPanels,
  onClosePanel,
  onAddSkills,
  onAddKnowledgeBase,
  onUploadFile,
  canAdd,
  initialArtifactId,
}: Readonly<ContextDockProps>) {
  const keys = PANEL_ORDER.filter((key) => openPanels.includes(key));
  return (
    <div className="h-full">
      <PanelGroup
        key={keys.join('-')}
        orientation="vertical"
        className="h-full"
      >
        {keys.map((key, index) => (
          <Fragment key={key}>
            {index > 0 && <ResizeHandle orientation="row" />}
            <Panel minSize={15}>
              <StackedPanel
                panel={key}
                project={project}
                chatId={chatId}
                onClose={() => onClosePanel(key)}
                onAddSkills={onAddSkills}
                onAddKnowledgeBase={onAddKnowledgeBase}
                onUploadFile={onUploadFile}
                canAdd={canAdd}
                initialArtifactId={initialArtifactId}
              />
            </Panel>
          </Fragment>
        ))}
      </PanelGroup>
    </div>
  );
}

interface StackedPanelProps {
  panel: PanelKey;
  project: MockProject;
  chatId: string;
  onClose: () => void;
  onAddSkills: () => void;
  onAddKnowledgeBase: () => void;
  onUploadFile: () => void;
  canAdd: boolean;
  initialArtifactId?: string;
}

function StackedPanel({
  panel,
  project,
  chatId,
  onClose,
  onAddSkills,
  onAddKnowledgeBase,
  onUploadFile,
  canAdd,
  initialArtifactId,
}: Readonly<StackedPanelProps>) {
  const [openedDoc, setOpenedDoc] = useState<ProjectDocument | null>(
    panel === 'output' && initialArtifactId
      ? ((project.generatedDocuments ?? []).find(
          (doc) => doc.id === initialArtifactId,
        ) ?? null)
      : null,
  );
  const isEditing = panel === 'output' && openedDoc !== null;

  function handleRemoveDoc(id: string) {
    removeGeneratedDocument(project.id, id);
    setOpenedDoc((cur) => (cur?.id === id ? null : cur));
  }

  const bodies: Record<PanelKey, ReactNode> = {
    skills: <SkillsBody project={project} />,
    knowledge: <KnowledgeBody project={project} />,
    output: (
      <OutputBody
        project={project}
        chatId={chatId}
        onOpen={(doc) => setOpenedDoc(doc)}
        onRemove={handleRemoveDoc}
      />
    ),
  };
  const label = PANELS[panel].label;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-1 px-3">
        {isEditing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-ml-1"
                onClick={() => setOpenedDoc(null)}
                aria-label="Zurück zur Übersicht"
              >
                <ChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zurück zur Übersicht</TooltipContent>
          </Tooltip>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {label}
        </span>
        {!isEditing && canAdd && panel === 'skills' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onAddSkills}
                aria-label="Skill hinzufügen"
              >
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Skill hinzufügen</TooltipContent>
          </Tooltip>
        )}
        {!isEditing && canAdd && panel === 'knowledge' && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Wissen hinzufügen"
                  >
                    <Plus />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Wissen hinzufügen</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddKnowledgeBase}>
                <Brain />
                Wissensdatenbank hinzufügen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onUploadFile}>
                <Upload />
                Datei hochladen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={`${label} schließen`}
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label} schließen</TooltipContent>
        </Tooltip>
      </div>
      {isEditing ? (
        <div className="min-h-0 flex-1">
          <MockWidgetView document={openedDoc} />
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3">{bodies[panel]}</div>
        </ScrollArea>
      )}
    </div>
  );
}

const ROW_CLASS = 'px-0 py-1.5';

function PanelEmpty({ text }: Readonly<{ text: string }>) {
  return <p className="py-4 text-xs text-muted-foreground">{text}</p>;
}

function PanelSubheading({ text }: Readonly<{ text: string }>) {
  return (
    <span className="text-xs font-medium text-muted-foreground">{text}</span>
  );
}

function SkillsBody({ project }: Readonly<{ project: MockProject }>) {
  if (project.skills.length === 0) {
    return <PanelEmpty text="Noch keine Skills in diesem Projekt." />;
  }
  return (
    <ItemGroup className="gap-0">
      {project.skills.map((skill) => (
        <Item key={skill.id} size="sm" className={ROW_CLASS}>
          <ItemContent>
            <ItemTitle>{skill.name}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}

function KnowledgeBody({ project }: Readonly<{ project: MockProject }>) {
  const hasAny =
    project.knowledgeBases.length > 0 || project.documents.length > 0;
  if (!hasAny) {
    return <PanelEmpty text="Noch kein Wissen in diesem Projekt." />;
  }
  return (
    <div className="flex flex-col gap-4">
      {project.knowledgeBases.length > 0 && (
        <div className="flex flex-col gap-1">
          <PanelSubheading text="Wissensdatenbanken" />
          <KnowledgeBaseRows knowledgeBases={project.knowledgeBases} compact />
        </div>
      )}
      {project.documents.length > 0 && (
        <div className="flex flex-col gap-1">
          <PanelSubheading text="Dateien" />
          <ItemGroup className="gap-0">
            {project.documents.map((doc) => (
              <Item key={doc.id} size="sm" className={ROW_CLASS}>
                <ItemContent>
                  <ItemTitle>{doc.name}</ItemTitle>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </div>
      )}
    </div>
  );
}

function OutputBody({
  project,
  chatId,
  onOpen,
  onRemove,
}: Readonly<{
  project: MockProject;
  chatId: string;
  onOpen: (doc: ProjectDocument) => void;
  onRemove: (id: string) => void;
}>) {
  const docs = (project.generatedDocuments ?? []).filter(
    (doc) => doc.chatId === chatId,
  );
  const canShare =
    project.ownerId === CURRENT_USER.id ||
    (project.allowContentSharing ?? true);

  if (docs.length === 0) {
    return (
      <PanelEmpty text="Hier erscheinen Inhalte, die Ayunis Core in diesem Chat erstellt." />
    );
  }
  return (
    <GeneratedContentRows
      documents={docs}
      compact
      onOpen={onOpen}
      onToggleShared={
        canShare
          ? (id) => toggleGeneratedDocumentShared(project.id, id)
          : undefined
      }
      onRemove={onRemove}
    />
  );
}
