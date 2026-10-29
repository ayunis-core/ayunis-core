import { useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Button } from '@ayunis/ui/components/button';
import config from '@/shared/config';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import ImageGenerationLoader from './ImageGenerationLoader';
import { generatedImageBackdropStyle } from './generated-image-backdrop';

const MAX_AUTO_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

async function downloadImage(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Image download failed with ${response.status}`);
    }
    saveBlobAs(await response.blob(), fileName);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

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
  const [hasLoadError, setHasLoadError] = useState(false);
  // Changing the src (via ?attempt=n) is what makes the <img> request again.
  const [attempt, setAttempt] = useState(0);
  const autoRetries = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  function handleLoadError() {
    if (autoRetries.current >= MAX_AUTO_RETRIES) {
      setHasLoadError(true);
      return;
    }
    const delay = RETRY_BASE_DELAY_MS * 2 ** autoRetries.current;
    autoRetries.current += 1;
    retryTimer.current = setTimeout(() => setAttempt((n) => n + 1), delay);
  }

  function retry() {
    autoRetries.current = 0;
    setHasLoadError(false);
    setAttempt((n) => n + 1);
  }

  const prompt =
    typeof content.params.prompt === 'string' ? content.params.prompt : '';

  if (isStreaming || !imageId || !threadId) {
    return <ImageGenerationLoader prompt={prompt} />;
  }

  const url = `${config.api.baseUrl}/threads/${threadId}/generated-images/${imageId}`;
  const src = attempt ? `${url}?attempt=${attempt}` : url;

  if (hasLoadError) {
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
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            {t('chat.tools.generate_image.retry')}
          </Button>
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
        <img
          src={src}
          alt={altText}
          onError={handleLoadError}
          className="w-full h-auto object-contain"
          style={generatedImageBackdropStyle}
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{altText}</DialogTitle>
          <img
            src={src}
            alt={altText}
            className="w-full h-full max-h-[90vh] object-contain rounded-lg"
            style={generatedImageBackdropStyle}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute left-3 top-3 gap-2 shadow-md"
            onClick={() =>
              void downloadImage(url, 'ayunis-generated-image.png')
            }
          >
            <Download className="size-4" />
            {t('chat.tools.generate_image.download')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
