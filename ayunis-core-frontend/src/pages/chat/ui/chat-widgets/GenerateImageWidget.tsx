import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useGeneratedImageUrl } from '../../api/useGeneratedImageUrl';
import AgentActivityHint from '@/widgets/agent-activity-hint/ui/AgentActivityHint';
import ImagePreview from './ImagePreview';

interface GenerateImageWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly isStreaming?: boolean;
  readonly threadId: string;
  readonly imageId?: string;
}

export default function GenerateImageWidget({
  content,
  isStreaming = false,
  threadId,
  imageId,
}: GenerateImageWidgetProps) {
  const { t } = useTranslation('chat');
  const [hintOpen, setHintOpen] = useState(false);
  const { url, isLoading, isError } = useGeneratedImageUrl(threadId, imageId);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params ?? {}) as { prompt?: string };
  const prompt = params.prompt ?? '';

  // Still generating — no result yet
  if (isStreaming && !imageId) {
    return (
      <AgentActivityHint
        open={hintOpen}
        onOpenChange={setHintOpen}
        icon={<Loader2 className="h-4 w-4 animate-spin" />}
        hint={t('chat.tools.generate_image.generating')}
        input={prompt}
      />
    );
  }

  // No image ID and not streaming — tool call without result (shouldn't normally happen)
  if (!imageId) {
    return (
      <AgentActivityHint
        open={hintOpen}
        onOpenChange={setHintOpen}
        icon={<ImageIcon className="h-4 w-4" />}
        hint={t('chat.tools.generate_image.title')}
        input={prompt}
      />
    );
  }

  // Error loading the image URL
  if (isError) {
    return (
      <AgentActivityHint
        open={hintOpen}
        onOpenChange={setHintOpen}
        icon={<AlertCircle className="h-4 w-4 text-destructive" />}
        hint={t('chat.tools.generate_image.error')}
        input={prompt}
      />
    );
  }

  // URL still loading
  if (isLoading || !url) {
    return (
      <AgentActivityHint
        open={hintOpen}
        onOpenChange={setHintOpen}
        icon={<Loader2 className="h-4 w-4 animate-spin" />}
        hint={t('chat.tools.generate_image.title')}
        input={prompt}
      />
    );
  }

  // Image ready — show preview with click-to-expand
  return <ImagePreview src={url} alt={prompt} />;
}
