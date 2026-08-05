import { useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  MoreHorizontal,
  Settings2,
  StarOff,
  Plus,
  Trash,
  Upload,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/shared/ui/shadcn/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  ProjectIcon,
  useProjects,
  FEATURES,
  reorderProjects,
  removeProject,
  moveProjectInSidebar,
  toggleProjectStarred,
  isPrivateProject,
  addChatToProject,
  ProjectSettingsDialog,
  ShareProjectDialog,
  type MockProject,
} from '@/entities/project';
import { useConfirmation } from '@/widgets/confirmation-modal';

export function ProjectsSidebarGroup({
  pinnedOnly = false,
}: Readonly<{ pinnedOnly?: boolean }>) {
  const projects = useProjects();
  const didDrag = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const pinned = projects.filter((p) => p.starred);
  const unpinned = projects.filter((p) => !p.starred);
  const shared = unpinned.filter((p) => !isPrivateProject(p));
  const privateProjects = unpinned.filter(isPrivateProject);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderProjects(String(active.id), String(over.id));
    }
    setTimeout(() => {
      didDrag.current = false;
    }, 0);
  }

  function suppressClickAfterDrag(event: React.MouseEvent) {
    if (didDrag.current) {
      event.preventDefault();
      event.stopPropagation();
      didDrag.current = false;
    }
  }

  const sections = (
    pinnedOnly
      ? [{ label: 'Projekte', items: pinned, sortable: true }]
      : [
          { label: 'Angeheftet', items: pinned, sortable: true },
          { label: 'Geteilt', items: shared, sortable: false },
          { label: 'Privat', items: privateProjects, sortable: false },
        ]
  ).filter((section) => section.items.length > 0);

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.label}>
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          {section.sortable ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => {
                didDrag.current = true;
              }}
              onDragCancel={() => {
                didDrag.current = false;
              }}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={section.items.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <SidebarMenu onClickCapture={suppressClickAfterDrag}>
                  {section.items.map((project, index) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      sortable
                      isFirst={index === 0}
                      isLast={index === section.items.length - 1}
                    />
                  ))}
                </SidebarMenu>
              </SortableContext>
            </DndContext>
          ) : (
            <SidebarMenu>
              {section.items.map((project) => (
                <ProjectItem key={project.id} project={project} />
              ))}
            </SidebarMenu>
          )}
        </SidebarGroup>
      ))}
    </>
  );
}

function ProjectItem({
  project,
  sortable = false,
  isFirst = false,
  isLast = false,
}: Readonly<{
  project: MockProject;
  sortable?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id, disabled: !sortable });

  const projectPath = `/projects/${project.id}`;
  const hasChats = project.chats.length > 0;
  const sortedChats = [...project.chats].sort(
    (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false),
  );

  function handleNewChat() {
    const chat = { id: crypto.randomUUID(), title: 'Neuer Chat', messages: [] };
    addChatToProject(project.id, chat);
    void navigate({
      to: '/projects/$projectId/chats/$chatId',
      params: { projectId: project.id, chatId: chat.id },
    });
  }

  function handleDelete() {
    confirm({
      title: 'Projekt löschen',
      description: `Möchten Sie das Projekt „${project.name}“ wirklich löschen?`,
      confirmText: 'Löschen',
      variant: 'destructive',
      onConfirm: () => {
        removeProject(project.id);
        if (location.pathname.startsWith(projectPath)) {
          void navigate({ to: '/chat' });
        }
      },
    });
  }

  return (
    <SidebarMenuItem
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'z-10 opacity-60')}
      {...attributes}
      {...listeners}
    >
      <SidebarMenuButton asChild isActive={location.pathname === projectPath}>
        <Link to="/projects/$projectId" params={{ projectId: project.id }}>
          <ProjectIcon
            icon={project.icon}
            color={project.color}
            variant="plain"
          />
          <span className="truncate">{project.name}</span>
          {hasChats && (
            <span
              role="button"
              tabIndex={0}
              aria-label={expanded ? 'Chats zuklappen' : 'Chats aufklappen'}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setExpanded((value) => !value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  setExpanded((value) => !value);
                }
              }}
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-sm text-sidebar-foreground/70 transition-opacity hover:bg-sidebar-accent md:opacity-0 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100',
                expanded && 'md:opacity-100',
              )}
            >
              <ChevronRight
                className={cn(
                  'size-3.5 transition-transform',
                  expanded && 'rotate-90',
                )}
              />
            </span>
          )}
        </Link>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label="Projektoptionen">
            <MoreHorizontal />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={handleNewChat}>
            <Plus />
            Neuer Chat
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {FEATURES.sharing && (
            <DropdownMenuItem onClick={() => setShareOpen(true)}>
              <Upload />
              Teilen
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Settings2 />
            Einstellungen
          </DropdownMenuItem>
          {sortable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isFirst}
                onClick={() =>
                  setTimeout(() => moveProjectInSidebar(project.id, 'up'), 150)
                }
              >
                <ArrowUp />
                Nach oben verschieben
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isLast}
                onClick={() =>
                  setTimeout(
                    () => moveProjectInSidebar(project.id, 'down'),
                    150,
                  )
                }
              >
                <ArrowDown />
                Nach unten verschieben
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={() => toggleProjectStarred(project.id)}>
            <StarOff />
            Aus Seitenleiste lösen
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash />
            Löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {expanded && (
        <SidebarMenuSub className="max-h-48 overflow-y-auto">
          {sortedChats.map((chat) => (
            <SidebarMenuSubItem key={chat.id}>
              <SidebarMenuSubButton
                asChild
                isActive={
                  location.pathname === `${projectPath}/chats/${chat.id}`
                }
              >
                <Link
                  to="/projects/$projectId/chats/$chatId"
                  params={{ projectId: project.id, chatId: chat.id }}
                >
                  <span className="truncate">{chat.title}</span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
      <ShareProjectDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        project={project}
      />
      {editOpen && (
        <ProjectSettingsDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          project={project}
        />
      )}
    </SidebarMenuItem>
  );
}
