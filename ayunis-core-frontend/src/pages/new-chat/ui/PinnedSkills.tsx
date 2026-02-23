import { Sparkles } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { useSkillsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';

interface PinnedSkillsProps {
  onSkillSelect: (skillId: string) => void;
  selectedSkillId?: string;
}

export function PinnedSkills({
  onSkillSelect,
  selectedSkillId,
}: Readonly<PinnedSkillsProps>) {
  const { data: skills } = useSkillsControllerFindAll();

  const pinnedSkills = skills?.filter((skill) => skill.isPinned) ?? [];

  if (pinnedSkills.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-center gap-2 flex-wrap">
      {pinnedSkills.map((skill) => (
        <Button
          key={skill.id}
          variant={selectedSkillId === skill.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSkillSelect(skill.id)}
        >
          <Sparkles className="h-4 w-4" />
          {skill.name}
        </Button>
      ))}
    </div>
  );
}
