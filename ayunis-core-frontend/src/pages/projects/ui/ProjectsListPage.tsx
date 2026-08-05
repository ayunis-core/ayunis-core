import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Check, Star, SlidersHorizontal } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import {
  useProjectsViewMode,
  type ProjectsViewMode,
} from '../model/useProjectsViewMode';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from '@/shared/ui/shadcn/card';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  ProjectIcon,
  useProjects,
  addProject,
  toggleProjectStarred,
  isPrivateProject,
  CURRENT_USER,
  MY_TEAM_IDS,
  orgTeams,
  ProjectAvatars,
  FEATURES,
  CreateProjectDialog,
  type MockProject,
} from '@/entities/project';

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: 'Zuletzt aktualisiert',
  createdAt: 'Erstellungsdatum',
  alpha: 'Alphabetisch',
};

const VIEW_MODE_LABELS: Record<ProjectsViewMode, string> = {
  grid: 'Kachelansicht',
  list: 'Listenansicht',
};

type SortKey = 'updatedAt' | 'createdAt' | 'alpha';

function sortProjects(list: MockProject[], sortKey: SortKey) {
  const sorted = [...list];
  if (sortKey === 'alpha') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  } else {
    sorted.sort((a, b) => b[sortKey].localeCompare(a[sortKey]));
  }
  return sorted;
}

export function ProjectsListPage() {
  const navigate = useNavigate();
  const projects = useProjects();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [viewMode, setViewMode] = useProjectsViewMode();

  const visible = sortProjects(
    projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    sortKey,
  );
  const mine = visible.filter((p) => p.ownerId === CURRENT_USER.id);
  const minePrivate = mine.filter(isPrivateProject);
  const mineShared = mine.filter((p) => !isPrivateProject(p));
  const notMine = visible.filter((p) => p.ownerId !== CURRENT_USER.id);
  const isDirectMember = (p: MockProject) =>
    p.collaborators.some((c) => c.id === CURRENT_USER.id);
  const isViaMyTeam = (p: MockProject) =>
    p.teams.some((t) => MY_TEAM_IDS.includes(t.id));
  const sharedDirect = notMine.filter(isDirectMember);
  const teamGroups = orgTeams
    .filter((team) => MY_TEAM_IDS.includes(team.id))
    .map((team) => ({
      team,
      projects: notMine.filter(
        (p) => !isDirectMember(p) && p.teams.some((t) => t.id === team.id),
      ),
    }))
    .filter((group) => group.projects.length > 0);
  const orgShared = notMine.filter(
    (p) => p.visibility === 'org' && !isDirectMember(p) && !isViaMyTeam(p),
  );
  const hasShared =
    sharedDirect.length > 0 || teamGroups.length > 0 || orgShared.length > 0;

  function openProject(id: string) {
    void navigate({ to: '/projects/$projectId', params: { projectId: id } });
  }

  const headerAction = (
    <>
      <div className="relative hidden w-52 sm:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Durchsuchen …"
          className="h-8 pl-9"
        />
      </div>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Sortieren und Darstellung"
              >
                <SlidersHorizontal />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Sortieren und Darstellung</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <DropdownMenuItem key={key} onClick={() => setSortKey(key)}>
              <span className="flex-1">{SORT_LABELS[key]}</span>
              {key === sortKey && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Darstellung</DropdownMenuLabel>
          {(Object.keys(VIEW_MODE_LABELS) as ProjectsViewMode[]).map((mode) => (
            <DropdownMenuItem key={mode} onClick={() => setViewMode(mode)}>
              <span className="flex-1">{VIEW_MODE_LABELS[mode]}</span>
              {mode === viewMode && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        Neues Projekt
      </Button>
    </>
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: 'Projekte' }]}
            action={headerAction}
          />
        }
        contentArea={
          <div className="flex flex-col gap-4 pt-2">
            <h1 className="text-2xl font-semibold">Projekte</h1>
            {!FEATURES.sharing ? (
              <ProjectGrid
                projects={mine}
                viewMode={viewMode}
                emptyText="Sie haben noch keine Projekte."
                onOpen={openProject}
              />
            ) : (
              <Tabs defaultValue="mine" className="w-full">
                <TabsList>
                  <TabsTrigger value="mine">Von Ihnen erstellt</TabsTrigger>
                  <TabsTrigger value="shared">Mit Ihnen geteilt</TabsTrigger>
                </TabsList>

                <TabsContent value="mine" className="mt-4">
                  {mine.length > 0 ? (
                    <div className="flex flex-col gap-6">
                      {minePrivate.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <h2 className="text-sm font-medium">
                            Private Projekte
                          </h2>
                          <ProjectGrid
                            projects={minePrivate}
                            viewMode={viewMode}
                            emptyText=""
                            onOpen={openProject}
                          />
                        </div>
                      )}
                      {mineShared.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <h2 className="text-sm font-medium">
                            Von mir geteilte Projekte
                          </h2>
                          <ProjectGrid
                            projects={mineShared}
                            viewMode={viewMode}
                            emptyText=""
                            onOpen={openProject}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Sie haben noch keine eigenen Projekte.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="shared" className="mt-4">
                  {hasShared ? (
                    <div className="flex flex-col gap-6">
                      {orgShared.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <h2 className="text-sm font-medium">Organisation</h2>
                          <ProjectGrid
                            projects={orgShared}
                            viewMode={viewMode}
                            emptyText=""
                            onOpen={openProject}
                          />
                        </div>
                      )}
                      {teamGroups.map(({ team, projects: teamProjects }) => (
                        <div key={team.id} className="flex flex-col gap-3">
                          <h2 className="text-sm font-medium">
                            Team {team.name}
                          </h2>
                          <ProjectGrid
                            projects={teamProjects}
                            viewMode={viewMode}
                            emptyText=""
                            onOpen={openProject}
                          />
                        </div>
                      ))}
                      {sharedDirect.length > 0 && (
                        <div className="flex flex-col gap-3">
                          <h2 className="text-sm font-medium">
                            Direkt mit Ihnen geteilt
                          </h2>
                          <ProjectGrid
                            projects={sharedDirect}
                            viewMode={viewMode}
                            emptyText=""
                            onOpen={openProject}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Mit Ihnen wurden noch keine Projekte geteilt.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        }
      />

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(project) => {
          addProject(project);
          openProject(project.id);
        }}
      />
    </AppLayout>
  );
}

function ProjectGrid({
  projects,
  viewMode,
  emptyText,
  onOpen,
}: Readonly<{
  projects: MockProject[];
  viewMode: ProjectsViewMode;
  emptyText: string;
  onOpen: (id: string) => void;
}>) {
  if (projects.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            onOpen={() => onOpen(project.id)}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={() => onOpen(project.id)}
        />
      ))}
    </div>
  );
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function projectCounts(project: MockProject) {
  if (!FEATURES.skillsAndKnowledge) {
    return countLabel(project.chats.length, 'Chat', 'Chats');
  }
  return [
    countLabel(project.skills.length, 'Skill', 'Skills'),
    countLabel(
      project.knowledgeBases.length,
      'Wissensdatenbank',
      'Wissensdatenbanken',
    ),
    countLabel(project.documents.length, 'Dokument', 'Dokumente'),
  ].join(' · ');
}

function StarButton({ project }: Readonly<{ project: MockProject }>) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={(e) => {
        e.stopPropagation();
        toggleProjectStarred(project.id);
      }}
      aria-label={project.starred ? 'Nicht mehr anheften' : 'Anheften'}
    >
      <Star
        className={cn(
          'size-4',
          project.starred ? 'fill-brand text-brand' : 'text-muted-foreground',
        )}
      />
    </Button>
  );
}

function ProjectRow({
  project,
  onOpen,
}: Readonly<{ project: MockProject; onOpen: () => void }>) {
  return (
    <Item variant="outline" className="cursor-pointer" onClick={onOpen}>
      <ItemMedia className="self-center translate-y-0">
        <ProjectIcon icon={project.icon} color={project.color} size="md" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="gap-2">
          <span className="truncate">{project.name}</span>
        </ItemTitle>
        <ItemDescription className="line-clamp-1 text-xs">
          {projectCounts(project)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="self-center">
        {FEATURES.sharing && <ProjectAvatars project={project} />}
        <StarButton project={project} />
      </ItemActions>
    </Item>
  );
}

function ProjectCard({
  project,
  onOpen,
}: Readonly<{ project: MockProject; onOpen: () => void }>) {
  return (
    <Card className="cursor-pointer gap-3 py-4" onClick={onOpen}>
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ProjectIcon icon={project.icon} color={project.color} size="md" />
          <span className="truncate">{project.name}</span>
        </CardTitle>
        <CardDescription className="line-clamp-2 min-h-10">
          {project.instructions}
        </CardDescription>
        <CardAction>
          <StarButton project={project} />
        </CardAction>
      </CardHeader>
      <CardFooter className="mt-auto px-4 text-xs text-muted-foreground">
        <span className="flex-1">{projectCounts(project)}</span>
        {FEATURES.sharing && <ProjectAvatars project={project} />}
      </CardFooter>
    </Card>
  );
}
