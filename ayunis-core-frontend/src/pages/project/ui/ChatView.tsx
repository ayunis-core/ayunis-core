import { useState } from 'react';
import { Panel, Group as PanelGroup } from 'react-resizable-panels';
import {
  ChevronLeft,
  MoreVertical,
  Pencil,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { MockChatInput } from './MockChatInput';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameChatDialog } from './RenameChatDialog';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';
import { Separator } from '@/shared/ui/shadcn/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import {
  AddProjectItemsDialog,
  type AddItemKind,
} from './AddProjectItemsDialog';
import { ContextDock, ResizeHandle } from './ContextDock';
import { PANELS, PANEL_ORDER, type PanelKey } from '../model/panels';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  ProjectIcon,
  addDocumentToProject,
  toggleChatPinned,
  renameChatInProject,
  removeChatFromProject,
  CURRENT_USER,
  type MockProject,
  type ProjectChat,
} from '@/entities/project';

interface ChatViewProps {
  project: MockProject;
  chat: ProjectChat;
  initialArtifactId?: string;
  onBackToProject: () => void;
}

export function ChatView({
  project,
  chat,
  initialArtifactId,
  onBackToProject,
}: Readonly<ChatViewProps>) {
  const [openPanels, setOpenPanels] = useState<PanelKey[]>(
    initialArtifactId ? ['output'] : [],
  );
  const [addKind, setAddKind] = useState<AddItemKind>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const { confirm } = useConfirmation();
  const canContribute =
    project.ownerId === CURRENT_USER.id || project.allowMemberContent;

  function handleUploadFile() {
    addDocumentToProject(project.id, {
      id: crypto.randomUUID(),
      name: `Dokument ${project.documents.length + 1}.pdf`,
    });
  }

  function handleDeleteChat() {
    confirm({
      title: 'Chat löschen',
      description: `Möchten Sie „${chat.title}“ wirklich löschen?`,
      confirmText: 'Löschen',
      variant: 'destructive',
      onConfirm: () => {
        removeChatFromProject(project.id, chat.id);
        onBackToProject();
      },
    });
  }

  function togglePanel(key: PanelKey) {
    setOpenPanels((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  }

  function closePanel(key: PanelKey) {
    setOpenPanels((cur) => cur.filter((k) => k !== key));
  }

  const hasPanels = openPanels.length > 0;

  return (
    <>
      <PanelGroup orientation="horizontal" className="absolute inset-0">
        <Panel defaultSize={hasPanels ? 60 : 100} minSize={40}>
          <ChatColumn
            project={project}
            chatTitle={chat.title}
            messages={chat.messages}
            isPinned={chat.pinned ?? false}
            onTogglePin={() => toggleChatPinned(project.id, chat.id)}
            onRename={() => setRenameOpen(true)}
            onDelete={handleDeleteChat}
            openPanels={openPanels}
            onTogglePanel={togglePanel}
            onBackToProject={onBackToProject}
          />
        </Panel>
        {hasPanels && (
          <>
            <ResizeHandle orientation="col" />
            <Panel defaultSize={40} minSize={320}>
              <ContextDock
                project={project}
                chatId={chat.id}
                openPanels={openPanels}
                onClosePanel={closePanel}
                onAddSkills={() => setAddKind('skills')}
                onAddKnowledgeBase={() => setAddKind('kb')}
                onUploadFile={handleUploadFile}
                canAdd={canContribute}
                initialArtifactId={initialArtifactId}
              />
            </Panel>
          </>
        )}
      </PanelGroup>

      <AddProjectItemsDialog
        project={project}
        kind={addKind}
        onClose={() => setAddKind(null)}
      />

      <RenameChatDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentTitle={chat.title}
        onRename={(title) => renameChatInProject(project.id, chat.id, title)}
      />
    </>
  );
}

interface ChatColumnProps {
  project: MockProject;
  chatTitle: string;
  messages: MockProject['chats'][number]['messages'];
  isPinned: boolean;
  onTogglePin: () => void;
  onRename: () => void;
  onDelete: () => void;
  openPanels: PanelKey[];
  onTogglePanel: (key: PanelKey) => void;
  onBackToProject: () => void;
}

function ChatColumn({
  project,
  chatTitle,
  messages,
  isPinned,
  onTogglePin,
  onRename,
  onDelete,
  openPanels,
  onTogglePanel,
  onBackToProject,
}: Readonly<ChatColumnProps>) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-4 h-14 shrink-0">
        <button
          type="button"
          onClick={onBackToProject}
          className="flex items-center gap-2 rounded-md px-1.5 py-1 -ml-1.5 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="size-4 text-muted-foreground" />
          <ProjectIcon icon={project.icon} color={project.color} />
          <span className="text-sm font-medium">{project.name}</span>
        </button>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          · {chatTitle}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                aria-label="Chat-Aktionen"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil />
                Chat umbenennen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTogglePin}>
                <Star className={cn(isPinned && 'fill-brand text-brand')} />
                {isPinned
                  ? 'Nicht mehr im Projekt anheften'
                  : 'Chat im Projekt anheften'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 />
                Chat löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="h-5" />
          {PANEL_ORDER.map((key) => {
            const Icon = PANELS[key].icon;
            const isOpen = openPanels.includes(key);
            const label = isOpen
              ? `${PANELS[key].label} ausblenden`
              : `${PANELS[key].label} anzeigen`;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isOpen ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    onClick={() => onTogglePanel(key)}
                    aria-label={label}
                  >
                    <Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto w-full max-w-[720px] flex flex-col gap-6 px-4 py-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="mx-auto w-full max-w-[720px] shrink-0 px-4 pb-4">
        {project.skills.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {project.skills.map((skill) => (
              <Badge key={skill.id} variant="secondary" className="gap-1">
                <Sparkles className="size-3 shrink-0" />
                {skill.name}
              </Badge>
            ))}
          </div>
        )}
        <MockChatInput />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
}: Readonly<{ message: MockProject['chats'][number]['messages'][number] }>) {
  if (message.role === 'user') {
    return (
      <div className="self-end max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm whitespace-pre-line">
        {message.text}
      </div>
    );
  }
  return (
    <div className="self-start max-w-[95%] text-sm whitespace-pre-line leading-relaxed">
      {message.text}
    </div>
  );
}
