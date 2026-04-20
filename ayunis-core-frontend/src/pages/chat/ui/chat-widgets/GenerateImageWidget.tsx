import { useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/shadcn/dialog';
import { cn } from '@/shared/lib/shadcn/utils';
import { useResolveGeneratedImage } from '../../api/useResolveGeneratedImage';
import type { ToolUseMessageContent } from '../../model/openapi';

interface GenerateImageWidgetProps {
  readonly content: ToolUseMessageContent;
  readonly imageId?: string;
  readonly threadId?: string;
  readonly isStreaming?: boolean;
}

export default function GenerateImageWidget({
  content,
  imageId,
  threadId,
  isStreaming = false,
}: GenerateImageWidgetProps) {
  const { t } = useTranslation('chat');
  const [isOpen, setIsOpen] = useState(false);

  const prompt =
    typeof content.params.prompt === 'string' ? content.params.prompt : '';

  const hasIds = Boolean(imageId && threadId);
  const { url, isLoading } = useResolveGeneratedImage({
    threadId: threadId ?? '',
    imageId: imageId ?? '',
  });

  const isGenerating = isStreaming || !hasIds;

  if (isGenerating) {
    return (
      <div className="my-2 w-full rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg bg-primary/10 animate-pulse',
            )}
          >
            <ImageIcon className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate animate-pulse">
              {t('chat.tools.generate_image.generating')}
            </p>
            {prompt && (
              <p className="text-xs text-muted-foreground truncate">{prompt}</p>
            )}
          </div>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="my-2 w-full rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <ImageIcon className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {t('chat.tools.generate_image.loading')}
            </p>
            {prompt && (
              <p className="text-xs text-muted-foreground truncate">{prompt}</p>
            )}
          </div>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="my-2 w-full rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
            <ImageIcon className="size-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">
              {t('chat.tools.generate_image.error')}
            </p>
            {prompt && (
              <p className="text-xs text-muted-foreground truncate">{prompt}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const altText = prompt || t('chat.tools.generate_image.altFallback');

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="my-2 block max-w-md overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
        aria-label={t('chat.tools.generate_image.openPreview')}
      >
        <img src={url} alt={altText} className="w-full h-auto object-contain" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{altText}</DialogTitle>
          <img
            src={url}
            alt={altText}
            className="w-full h-full max-h-[90vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
