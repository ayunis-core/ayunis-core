import { ProjectIcon } from './ProjectIcon';
import { Check } from 'lucide-react';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/shared/ui/shadcn/dropdown-menu';
import { useProjects } from '../model/store';
import { isPrivateProject } from '../model/visibility';
import type { MockProject } from '../model/mock';

export function ProjectMenuGroups({
  onSelect,
  selectedProjectId,
}: Readonly<{
  onSelect: (project: MockProject) => void;
  selectedProjectId?: string;
}>) {
  const projects = useProjects();
  const groups = [
    { label: 'Privat', items: projects.filter(isPrivateProject) },
    { label: 'Geteilt', items: projects.filter((p) => !isPrivateProject(p)) },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="max-h-72 overflow-y-auto">
      {groups.map((group) => (
        <DropdownMenuGroup key={group.label}>
          <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
          {group.items.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => onSelect(project)}
            >
              <ProjectIcon icon={project.icon} color={project.color} />
              <span className="flex-1">{project.name}</span>
              {project.id === selectedProjectId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      ))}
    </div>
  );
}
