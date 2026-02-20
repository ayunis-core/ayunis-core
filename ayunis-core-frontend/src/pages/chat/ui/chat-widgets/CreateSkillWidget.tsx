import { useState, useEffect } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Label } from '@/shared/ui/shadcn/label';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { Switch } from '@/shared/ui/shadcn/switch';
import { cn } from '@/shared/lib/shadcn/utils';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  skillsControllerCreate,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

export default function CreateSkillWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();

  const params = content.params as {
    name?: string;
    short_description?: string;
    instructions?: string;
    is_active?: boolean;
  };

  const [name, setName] = useState<string>(params.name ?? '');
  const [shortDescription, setShortDescription] = useState<string>(
    params.short_description ?? '',
  );
  const [instructions, setInstructions] = useState<string>(
    params.instructions ?? '',
  );
  const [isActive, setIsActive] = useState<boolean>(params.is_active !== false);
  const [created, setCreated] = useState(false);

  // Update state when params change (for streaming updates)
  useEffect(() => {
    const updateWidget = () => {
      setName(params.name ?? '');
      setShortDescription(params.short_description ?? '');
      setInstructions(params.instructions ?? '');
      setIsActive(params.is_active !== false);
    };
    updateWidget();
  }, [
    params.name,
    params.short_description,
    params.instructions,
    params.is_active,
    content.id,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      return await skillsControllerCreate({
        name,
        shortDescription,
        instructions,
        isActive,
      });
    },
    onSuccess: () => {
      setCreated(true);
      showSuccess(t('chat.tools.create_skill.success'));
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'SKILL_NAME_ALREADY_EXISTS') {
          showError(t('chat.tools.create_skill.errorDuplicate'));
        } else {
          showError(t('chat.tools.create_skill.error'));
        }
      } catch {
        showError(t('chat.tools.create_skill.error'));
      }
    },
  });

  const isValid = name.trim().length > 0 && instructions.trim().length > 0;

  return (
    <div
      className="my-2 space-y-4 w-full"
      key={`${content.name}-${content.id}`}
    >
      <div className="space-y-2 w-full">
        <Label
          htmlFor={`create-skill-name-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_skill.name')}
        </Label>
        <Input
          className={cn('w-full', isStreaming && 'animate-pulse')}
          id={`create-skill-name-${content.id}`}
          placeholder={t('chat.tools.create_skill.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={created}
        />
      </div>

      <div className="space-y-2 w-full">
        <Label
          htmlFor={`create-skill-description-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_skill.shortDescription')}
        </Label>
        <Input
          className={cn('w-full', isStreaming && 'animate-pulse')}
          id={`create-skill-description-${content.id}`}
          placeholder={t('chat.tools.create_skill.shortDescriptionPlaceholder')}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          disabled={created}
        />
      </div>

      <div className="space-y-2 w-full">
        <Label
          htmlFor={`create-skill-instructions-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_skill.instructions')}
        </Label>
        <Textarea
          id={`create-skill-instructions-${content.id}`}
          placeholder={t('chat.tools.create_skill.instructionsPlaceholder')}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className={cn('h-40', isStreaming && 'animate-pulse')}
          disabled={created}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id={`create-skill-active-${content.id}`}
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={created}
          className={cn(isStreaming && 'animate-pulse')}
        />
        <Label
          htmlFor={`create-skill-active-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.create_skill.active')}
        </Label>
      </div>

      <div className="w-full flex gap-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending || created}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {created
            ? t('chat.tools.create_skill.created')
            : t('chat.tools.create_skill.create')}
        </Button>
      </div>
    </div>
  );
}
