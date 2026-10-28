import { useState, useEffect } from 'react';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { useTranslation } from 'react-i18next';
import { Label } from '@ayunis/ui/components/label';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import { useThreadWorkspaceId } from '@/pages/chat/api/useThreadWorkspaceId';
import { useEditSkillFromChat } from '@/pages/chat/api/useEditSkillFromChat';

export default function EditSkillWidget({
  content,
  isStreaming = false,
  threadId,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
  threadId?: string;
}>) {
  const { t } = useTranslation('chat');
  const workspaceId = useThreadWorkspaceId(threadId);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as {
    skill_slug?: string;
    skill_id?: string;
    name?: string;
    short_description?: string;
    instructions?: string;
    change_summary?: string;
  };

  const skillSlug = params.skill_slug ?? '';
  const [name, setName] = useState<string>(params.name ?? '');
  const [shortDescription, setShortDescription] = useState<string>(
    params.short_description ?? '',
  );
  const [instructions, setInstructions] = useState<string>(
    params.instructions ?? '',
  );
  const [updated, setUpdated] = useState(false);
  const {
    existingSkill,
    targetIsValid,
    targetLookupComplete,
    updateSkill,
    isPending,
  } = useEditSkillFromChat({
    skillId: params.skill_id,
    skillSlug,
    threadId,
    workspaceId,
    onUpdated: () => setUpdated(true),
  });

  // Merge streaming params with existing skill data as fallback.
  // Empty-string params mean "unchanged" — fill from existing skill.
  useEffect(() => {
    const mergedName = params.name || existingSkill?.name || '';
    const mergedDescription =
      params.short_description || existingSkill?.shortDescription || '';
    const mergedInstructions =
      params.instructions || existingSkill?.instructions || '';

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

  const skillNotFound =
    !isStreaming && !!skillSlug && targetLookupComplete && !targetIsValid;

  const isValid =
    targetIsValid &&
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
          onClick={() => updateSkill({ name, shortDescription, instructions })}
          disabled={!isValid || isPending || updated}
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
