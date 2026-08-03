import { Users } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';
import type { MockProject } from '../model/mock';

export function ProjectTeamBadge({
  project,
}: Readonly<{ project: MockProject }>) {
  if (project.teams.length === 0) {
    return null;
  }
  const [first, ...rest] = project.teams;
  return (
    <Badge variant="secondary" className="max-w-44 gap-1">
      <Users className="size-3 shrink-0" />
      <span className="truncate">{first.name}</span>
      {rest.length > 0 && <span className="shrink-0">+{rest.length}</span>}
    </Badge>
  );
}
