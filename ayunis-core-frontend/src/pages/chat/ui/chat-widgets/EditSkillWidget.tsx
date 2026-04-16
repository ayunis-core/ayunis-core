import { useState, useEffect } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { slugify } from '../../lib/slugify';
import { useTranslation } from 'react-i18next';
import { Label } from '@/shared/ui/shadcn/label';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  skillsControllerUpdate,
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
  useSkillsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

export default function EditSkillWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as {
    skill_slug?: string;
    name?: string;
    short_description?: string;
    instructions?: string;
    change_summary?: string;
  };

  // Resolve skill_slug to existing skill via the skills list
  const { data: skills } = useSkillsControllerFindAll({
    query: { staleTime: Infinity },
  });
  const skillSlug = params.skill_slug ?? '';
  const bareSlug = skillSlug.replace(/^(user|system)__/, '');
  const existingSkill = skills?.find((s) => slugify(s.name) === bareSlug);
  const skillId = existingSkill?.id ?? '';

  const [name, setName] = useState<string>(params.name ?? '');
  const [shortDescription, setShortDescription] = useState<string>(
    params.short_description ?? '',
  );
  const [instructions, setInstructions] = useState<string>(
    params.instructions ?? '',
  );
  const [updated, setUpdated] = useState(false);

  // Merge streaming params with existing skill data as fallback.
  // Empty-string params mean "unchanged" — fill from existing skill.
  useEffect(() => {
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- empty string means "unchanged", must fall through to existing skill data */
    const mergedName = params.name || existingSkill?.name || '';
    const mergedDescription =
      params.short_description || existingSkill?.shortDescription || '';
    const mergedInstructions =
      params.instructions || existingSkill?.instructions || '';
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

    const updateWidget = () => {
      setName(mergedName);
      setShortDescription(mergedDescription);
      setInstructions(mergedInstructions);
    };
    updateWidget();
  }, [
    params.name,
    params.short_description,
    params.instructions,
    existingSkill,
    content.id,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      return await skillsControllerUpdate(skillId, {
        name,
        shortDescription,
        instructions,
      });
    },
    onSuccess: () => {
      setUpdated(true);
      showSuccess(t('chat.tools.edit_skill.success'));
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindOneQueryKey(skillId),
      });
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'SKILL_NAME_ALREADY_EXISTS') {
          showError(t('chat.tools.edit_skill.errorDuplicate'));
        } else {
          showError(t('chat.tools.edit_skill.error'));
        }
      } catch {
        showError(t('chat.tools.edit_skill.error'));
      }
    },
  });

  const skillNotFound = !!skillSlug && !!skills && !existingSkill;

  const isValid =
    !!skillId &&
    name.trim().length > 0 &&
    shortDescription.trim().length > 0 &&
    instructions.trim().length > 0;

  return (
    <div
      className="my-2 space-y-4 w-full"
      key={`${content.name}-${content.id}`}
    >
      {params.change_summary && (
        <p
          className={cn(
            'text-sm text-muted-foreground',
            isStreaming && 'animate-pulse',
          )}
        >
          {t('chat.tools.edit_skill.changeSummary')}: {params.change_summary}
        </p>
      )}

      <div className="space-y-2 w-full">
        <Label
          htmlFor={`edit-skill-name-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.edit_skill.name')}
        </Label>
        <Input
          className={cn('w-full', isStreaming && 'animate-pulse')}
          id={`edit-skill-name-${content.id}`}
          placeholder={t('chat.tools.edit_skill.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={updated}
        />
      </div>

      <div className="space-y-2 w-full">
        <Label
          htmlFor={`edit-skill-description-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.edit_skill.shortDescription')}
        </Label>
        <Input
          className={cn('w-full', isStreaming && 'animate-pulse')}
          id={`edit-skill-description-${content.id}`}
          placeholder={t('chat.tools.edit_skill.shortDescriptionPlaceholder')}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          disabled={updated}
        />
      </div>

      <div className="space-y-2 w-full">
        <Label
          htmlFor={`edit-skill-instructions-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.edit_skill.instructions')}
        </Label>
        <Textarea
          id={`edit-skill-instructions-${content.id}`}
          placeholder={t('chat.tools.edit_skill.instructionsPlaceholder')}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className={cn('h-40', isStreaming && 'animate-pulse')}
          disabled={updated}
        />
      </div>

      <div className="w-full flex gap-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending || updated}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {updated
            ? t('chat.tools.edit_skill.updated')
            : t('chat.tools.edit_skill.update')}
        </Button>
        {skillNotFound && (
          <p className="text-sm text-destructive">
            {t('chat.tools.edit_skill.skillNotFound')}
          </p>
        )}
      </div>
    </div>
  );
}
