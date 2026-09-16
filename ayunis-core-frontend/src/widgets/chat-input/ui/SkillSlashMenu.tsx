import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@ayunis/ui/components/popover';
import type { SkillOption } from '@/widgets/chat-input/api/useSkillOptions';

interface SkillSlashMenuProps {
  isOpen: boolean;
  skills: SkillOption[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (skill: SkillOption) => void;
  onClose: () => void;
  children: ReactNode;
}

export function SkillSlashMenu({
  isOpen,
  skills,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onClose,
  children,
}: Readonly<SkillSlashMenuProps>) {
  const { t } = useTranslation('common');

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        collisionPadding={8}
        className="w-72 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        data-testid="skill-slash-menu"
      >
        <p className="text-muted-foreground px-2 pt-1 pb-2 text-xs">
          {t('chatInput.slashMenuHint')}
        </p>
        <div className="max-h-64 overflow-y-auto">
          {skills.map((skill, index) => (
            <button
              key={skill.id}
              type="button"
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => onSelect(skill)}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                index === activeIndex && 'bg-accent text-accent-foreground',
              )}
              data-testid={`skill-slash-option-${skill.id}`}
            >
              <Sparkles className="size-3.5 shrink-0" />
              <span className="truncate">{skill.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
