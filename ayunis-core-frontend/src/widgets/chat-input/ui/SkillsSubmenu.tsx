import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { Button } from '@ayunis/ui/components/button';
import { Check, Loader2, Pin, Settings2, Sparkles } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@ayunis/ui/lib/cn';
import { useSkillsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { useSetSkillPin } from '@/features/skill-actions';

interface SkillsSubmenuProps {
  selectedSkillId?: string;
  onSkillSelect: (skillId: string, skillName: string) => void;
}

function SkillItem({
  skill,
  isSelected,
  onSelect,
}: Readonly<{
  skill: SkillResponseDto;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const setPin = useSetSkillPin();
  const pinLabel = skill.isPinned ? 'Nicht mehr anheften' : 'Anheften';
  return (
    <DropdownMenuItem onSelect={onSelect} className="group pr-1">
      <span className="flex-1 truncate">{skill.name}</span>
      {isSelected && <Check className="h-4 w-4" />}
      <Button
        variant="ghost"
        size="icon"
        aria-label={pinLabel}
        title={pinLabel}
        disabled={setPin.isPending}
        className={cn(
          'size-6',
          !skill.isPinned &&
            'opacity-0 group-focus:opacity-100 group-hover:opacity-100',
        )}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPin.mutate({ id: skill.id, isPinned: !skill.isPinned });
        }}
      >
        <Pin className={cn('h-3.5 w-3.5', skill.isPinned && 'fill-current')} />
      </Button>
    </DropdownMenuItem>
  );
}

export function SkillsSubmenu({
  selectedSkillId,
  onSkillSelect,
}: Readonly<SkillsSubmenuProps>) {
  const navigate = useNavigate();
  const { data, isLoading } = useSkillsControllerFindAll(
    personalSkillListParams,
  );
  const skills = (data?.data ?? []).filter((skill) => skill.isActive);
  const pinned = skills.filter((skill) => skill.isPinned);
  const others = skills.filter((skill) => !skill.isPinned);

  const renderItem = (skill: SkillResponseDto) => (
    <SkillItem
      key={skill.id}
      skill={skill}
      isSelected={skill.id === selectedSkillId}
      onSelect={() => onSkillSelect(skill.id, skill.name)}
    />
  );

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Sparkles className="h-4 w-4" />
          Fähigkeit anwenden
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-64">
          {isLoading && (
            <DropdownMenuItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird geladen …
            </DropdownMenuItem>
          )}
          {!isLoading && skills.length === 0 && (
            <DropdownMenuItem disabled>Noch keine Fähigkeiten</DropdownMenuItem>
          )}
          {pinned.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Angeheftet
              </DropdownMenuLabel>
              {pinned.map(renderItem)}
            </>
          )}
          {others.length > 0 && (
            <>
              {pinned.length > 0 && <DropdownMenuSeparator />}
              {others.map(renderItem)}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void navigate({ to: '/skills' })}>
            <Settings2 className="h-4 w-4" />
            Fähigkeiten verwalten
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
