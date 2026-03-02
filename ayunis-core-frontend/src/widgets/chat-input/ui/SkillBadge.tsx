import { Sparkles, XIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';

interface SkillBadgeProps {
  skillName: string;
  onRemove: () => void;
}

export function SkillBadge({ skillName, onRemove }: Readonly<SkillBadgeProps>) {
  return (
    <Badge variant="secondary">
      <Sparkles className="h-3 w-3" />
      {skillName}
      <div className="cursor-pointer" onClick={() => onRemove()}>
        <XIcon className="h-3 w-3" />
      </div>
    </Badge>
  );
}
