import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/features/theme';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';

interface CodeBlockProps {
  language?: string;
  children: string;
  inline?: boolean;
  className?: string;
}

export default function CodeBlock({
  language,
  children,
  inline = false,
  className = '',
}: Readonly<CodeBlockProps>) {
  const { theme } = useTheme();
  const { t } = useTranslation('chat');
  const [copied, setCopied] = useState(false);

  if (inline) {
    return (
      <code
        className={`${className} bg-muted px-1 py-0.5 rounded text-sm font-mono`}
      >
        {children}
      </code>
    );
  }

  const code = children.replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code block:', error);
    }
  };

  return (
    <div className="relative my-4 max-w-full">
      <SyntaxHighlighter
        style={theme === 'dark' ? oneDark : oneLight}
        language={language ?? 'text'}
        PreTag="div"
        customStyle={{
          margin: '0',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          overflow: 'auto',
        }}
      >
        {code}
      </SyntaxHighlighter>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-1 right-1"
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
    </div>
  );
}
