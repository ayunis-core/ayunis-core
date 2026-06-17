import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';

interface CopyAssistantTextButtonProps {
  readonly contentRef: React.RefObject<HTMLDivElement | null>;
}

export default function CopyAssistantTextButton({
  contentRef,
}: CopyAssistantTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('chat');

  const handleCopy = async () => {
    const el = contentRef.current;
    if (!el) return;

    const copyableElements = el.querySelectorAll('[data-copyable="true"]');
    if (copyableElements.length === 0) return;

    const htmlParts: string[] = [];
    const textParts: string[] = [];
    copyableElements.forEach((element) => {
      htmlParts.push(element.innerHTML);
      textParts.push((element as HTMLElement).innerText || '');
    });

    const html = htmlParts.join('<br><br>');
    const plainText = textParts.join('\n\n');
    if (!plainText.trim()) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy message:', error);
      }
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
