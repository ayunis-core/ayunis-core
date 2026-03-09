import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { slugify } from '../../lib/slugify';
import AgentActivityHint from '@/widgets/agent-activity-hint/ui/AgentActivityHint';
import { useSkillsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';

function useSkillName(skillSlug: string | undefined): string | undefined {
  const { data: skills } = useSkillsControllerFindAll();

  if (!skillSlug || !skills) return undefined;

  // Slugs have a prefix like "user__" or "system__" — strip it
  const bareSlug = skillSlug.replace(/^(user|system)__/, '');

  return skills.find((s) => slugify(s.name) === bareSlug)?.name;
}

export default function ActivateSkillWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);

  const skillSlug = (content.params as { skill_slug?: string } | undefined)
    ?.skill_slug;
  const skillName = useSkillName(skillSlug);

  const hasParams =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming
    content.params && Object.keys(content.params).length > 0;
  const isLoadingParams = isStreaming && !hasParams;

  const hint = skillName ?? t('chat.tools.activate_skill');

  return (
    <AgentActivityHint
      open={open}
      onOpenChange={setOpen}
      icon={
        isStreaming || isLoadingParams ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )
      }
      hint={hint}
      input={isLoadingParams ? '' : JSON.stringify(content.params, null, 2)}
    />
  );
}
