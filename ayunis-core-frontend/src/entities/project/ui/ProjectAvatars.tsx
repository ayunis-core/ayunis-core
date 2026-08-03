import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/shared/ui/shadcn/avatar';
import { cn } from '@/shared/lib/shadcn/utils';
import type { MockProject } from '../model/mock';

interface ProjectAvatarsProps {
  project: MockProject;
  max?: number;
  avatarClassName?: string;
}

export function ProjectAvatars({
  project,
  max = 3,
  avatarClassName,
}: Readonly<ProjectAvatarsProps>) {
  if (project.collaborators.length <= 1) {
    return null;
  }

  const visible = project.collaborators.slice(0, max);
  const overflow = project.collaborators.length - visible.length;

  return (
    <AvatarGroup>
      {visible.map((person) => (
        <Avatar key={person.id} className={cn('size-6', avatarClassName)}>
          <AvatarFallback className="text-[10px]">
            {person.initials}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <AvatarGroupCount className={cn('size-6 text-[10px]', avatarClassName)}>
          +{overflow}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}
