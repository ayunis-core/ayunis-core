import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useEmbedded } from '@/shared/contexts/embedded/useEmbedded';

function copyTextViaExecCommand(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    // eslint-disable-next-line sonarjs/deprecation
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

interface CopyAssistantTextButtonProps {
  readonly contentRef: React.RefObject<HTMLDivElement | null>;
}

export default function CopyAssistantTextButton({
  contentRef,
}: CopyAssistantTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('chat');
  const isEmbedded = useEmbedded();

  const markCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

    if (isEmbedded) {
      if (copyTextViaExecCommand(plainText)) markCopied();
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      markCopied();
    } catch {
      try {
        await navigator.clipboard.writeText(plainText);
        markCopied();
      } catch (error) {
        if (copyTextViaExecCommand(plainText)) markCopied();
        else console.error('Failed to copy message:', error);
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
