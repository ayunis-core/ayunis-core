import { Loader2, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ToolUseMessageContent } from '../../model/openapi';
import { formatToolName } from '../../lib/format-tool-name';
import AgentActivityHint from '@/widgets/agent-activity-hint/ui/AgentActivityHint';
import { useState } from 'react';

export default function ExecutableToolWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);

  // Check if params are empty or incomplete (streaming in progress)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const hasParams = content.params && Object.keys(content.params).length > 0;
  const isLoadingParams = isStreaming && !hasParams;

  // Try to get translation, fallback to formatted tool name if not found
  // When a key doesn't exist, i18next returns the key itself (with namespace prefix)
  const translationKey = `chat.tools.${content.name}`;
  const translation = t(translationKey, { defaultValue: '' });
  const toolHint =
    translation && typeof translation === 'string' && translation !== ''
      ? translation
      : formatToolName(content.name);

  return (
    <AgentActivityHint
      open={open}
      onOpenChange={setOpen}
      icon={
        isStreaming || isLoadingParams ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4" />
        )
      }
      hint={toolHint}
      input={isLoadingParams ? '' : JSON.stringify(content.params, null, 2)}
    />
  );
}
