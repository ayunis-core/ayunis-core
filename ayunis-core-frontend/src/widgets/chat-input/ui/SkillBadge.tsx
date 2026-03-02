import { Sparkles, XIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';

interface SkillBadgeProps {
  skillName: string;
  onRemove: () => void;
}

export function SkillBadge({ skillName, onRemove }: Readonly<SkillBadgeProps>) {
  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 rounded-full border-none"
      onClick={() => onRemove()}
    >
      <Sparkles className="h-3 w-3" />
      {skillName}
      <XIcon className="h-3 w-3 cursor-pointer" />
    </Badge>
  );
}
