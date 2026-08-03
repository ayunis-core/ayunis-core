import { ChevronDown, FolderOpen } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  ProjectIcon,
  ProjectMenuGroups,
  useProjects,
} from '@/entities/project';
import {
  useAttachedProjectId,
  setAttachedProject,
} from '@/features/useAttachedProject';

export function ProjectPicker() {
  const projects = useProjects();
  const attachedProjectId = useAttachedProjectId();
  const project = projects.find((p) => p.id === attachedProjectId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={project ? 'gap-2' : 'gap-2 text-muted-foreground'}
        >
          {project ? (
            <>
              <ProjectIcon icon={project.icon} color={project.color} />
              {project.name}
            </>
          ) : (
            <>
              <FolderOpen className="size-4" />
              Projekt auswählen
            </>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-56"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <ProjectMenuGroups
          selectedProjectId={attachedProjectId ?? undefined}
          onSelect={(selected) =>
            setAttachedProject(
              selected.id === attachedProjectId ? null : selected.id,
            )
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
