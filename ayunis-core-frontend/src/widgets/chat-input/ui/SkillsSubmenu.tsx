import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSkillsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import { useIsSkillsEnabled } from '@/features/feature-toggles';

interface SkillsSubmenuProps {
  onSkillSelect: (skillId: string, skillName: string) => void;
  selectedSkillId?: string;
}

export function SkillsSubmenu({
  onSkillSelect,
  selectedSkillId,
}: Readonly<SkillsSubmenuProps>) {
  const { t } = useTranslation('common');
  const skillsEnabled = useIsSkillsEnabled();
  const {
    data: skills,
    isLoading,
    error,
  } = useSkillsControllerFindAll({ query: { enabled: skillsEnabled } });

  if (!skillsEnabled) return null;

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Sparkles className="h-4 w-4" />
          {t('chatInput.addSkill')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {isLoading && (
            <DropdownMenuItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading')}
            </DropdownMenuItem>
          )}
          {!isLoading && !!error && (
            <DropdownMenuItem disabled className="text-destructive">
              {t('chatInput.skillsLoadError')}
            </DropdownMenuItem>
          )}
          {!isLoading && !error && (skills?.length ?? 0) === 0 && (
            <DropdownMenuItem disabled>
              {t('chatInput.skillsEmptyState')}
            </DropdownMenuItem>
          )}
          {!isLoading && !error
            ? skills?.map((skill) => (
                <DropdownMenuItem
                  key={skill.id}
                  onClick={() => onSkillSelect(skill.id, skill.name)}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{skill.name}</span>
                  {selectedSkillId === skill.id && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))
            : null}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
