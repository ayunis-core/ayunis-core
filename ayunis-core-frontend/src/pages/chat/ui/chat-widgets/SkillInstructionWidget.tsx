import { useTranslation } from 'react-i18next';
import AgentActivityHint from '@/widgets/agent-activity-hint/ui/AgentActivityHint';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { TextMessageContentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface SkillInstructionWidgetProps {
  content: TextMessageContentResponseDto;
}

export default function SkillInstructionWidget({
  content,
}: Readonly<SkillInstructionWidgetProps>) {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);

  return (
    <AgentActivityHint
      open={open}
      onOpenChange={setOpen}
      icon={<Sparkles className="h-4 w-4" />}
      hint={t('chat.skillInstructions')}
      input={content.text}
    />
  );
}
