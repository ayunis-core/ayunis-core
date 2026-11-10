import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export interface CopyableContent {
  readonly text: string;
  readonly html?: string;
}

interface CopyMessageButtonProps {
  readonly getContent: () => CopyableContent | null;
}

async function writeToClipboard({ text, html }: CopyableContent) {
  if (html === undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(text);
  }
}

export default function CopyMessageButton({
  getContent,
}: CopyMessageButtonProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('chat');

  const handleCopy = async () => {
    const content = getContent();
    if (!content?.text.trim()) return;

    try {
      await writeToClipboard(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mt-1"
          onClick={() => void handleCopy()}
          aria-label={t('chat.copyToClipboard')}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('chat.copyToClipboard')}</TooltipContent>
    </Tooltip>
  );
}
