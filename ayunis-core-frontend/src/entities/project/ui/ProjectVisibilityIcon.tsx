import { Lock, Building2, Users, Share2 } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';
import type { MockProject } from '../model/mock';

interface ProjectVisibilityIconProps {
  project: MockProject;
  className?: string;
}

export function ProjectVisibilityIcon({
  project,
  className,
}: Readonly<ProjectVisibilityIconProps>) {
  const iconClassName = cn(
    'size-3.5 shrink-0 text-muted-foreground',
    className,
  );
  if (project.visibility === 'org') {
    return <Building2 className={iconClassName} />;
  }
  if (project.teams.length > 0) {
    return <Users className={iconClassName} />;
  }
  if (project.collaborators.length > 1) {
    return <Share2 className={iconClassName} />;
  }
  return <Lock className={iconClassName} />;
}
