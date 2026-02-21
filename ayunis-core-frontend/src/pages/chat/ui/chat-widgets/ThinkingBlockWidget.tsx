import { useTranslation } from 'react-i18next';
import type { ThinkingMessageContent } from '../../model/openapi';
import AgentActivityHint from '@/widgets/agent-activity-hint/ui/AgentActivityHint';
import { Brain } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThinkingBlockWidgetProps {
  content: ThinkingMessageContent;
  open: boolean;
}

export default function ThinkingBlockWidget({
  content,
  open: initialOpen,
}: Readonly<ThinkingBlockWidgetProps>) {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  return (
    <AgentActivityHint
      open={open}
      onOpenChange={setOpen}
      icon={<Brain className="h-4 w-4" />}
      hint={t(`chat.thinking`)}
      input={content.thinking}
    />
  );
}
