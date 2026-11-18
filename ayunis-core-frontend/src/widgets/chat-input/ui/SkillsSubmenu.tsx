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
import { personalSkillListParams } from '@/shared/api/skill-scopes';

interface SkillsSubmenuProps {
  onSkillSelect: (skillId: string, skillName: string) => void;
  selectedSkillId?: string;
}

export function SkillsSubmenu({
  onSkillSelect,
  selectedSkillId,
}: Readonly<SkillsSubmenuProps>) {
  const { t } = useTranslation('common');
  const { data, isLoading, error } = useSkillsControllerFindAll(
    personalSkillListParams,
  );
  const skills = data?.data.filter((skill) => skill.isActive) ?? [];

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
            <DropdownMenuItem disabled variant="destructive">
              {t('chatInput.skillsLoadError')}
            </DropdownMenuItem>
          )}
          {!isLoading && !error && skills.length === 0 && (
            <DropdownMenuItem disabled>
              {t('chatInput.skillsEmptyState')}
            </DropdownMenuItem>
          )}
          {skills.map((skill) => (
            <DropdownMenuItem
              key={skill.id}
              data-testid={`chat-input-skill-${skill.id}`}
              onClick={() => onSkillSelect(skill.id, skill.name)}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate" title={skill.name}>
                {skill.name}
              </span>
              {selectedSkillId === skill.id && (
                <Check className="h-4 w-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
