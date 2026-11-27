import { memo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useDarkTheme } from '@ayunis/ui/hooks/use-dark-theme';

export interface CodeBlockProps {
  /** Defaults to the document's theme. */
  readonly isDark?: boolean;
  language?: string;
  children: string;
  inline?: boolean;
  className?: string;
  /** False renders the code as plain text, e.g. while its fence is still streaming. */
  highlight?: boolean;
  onCopied?: () => void;
}

function CodeBlock({
  language,
  isDark,
  children,
  inline = false,
  className = '',
  highlight = true,
  onCopied,
}: Readonly<CodeBlockProps>) {
  const documentIsDark = useDarkTheme();
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
  const showLineNumbers = code.includes('\n');

  return (
    <div className="relative my-4 max-w-full">
      <SyntaxHighlighter
        style={(isDark ?? documentIsDark) ? oneDark : oneLight}
        language={highlight ? (language ?? 'text') : 'text'}
        PreTag="div"
        showLineNumbers={showLineNumbers}
        lineNumberStyle={{ userSelect: 'none' }}
        customStyle={{
          margin: '0',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          overflow: 'auto',
        }}
      >
        {code}
      </SyntaxHighlighter>
      <CodeCopyAction code={code} onCopied={onCopied} />
    </div>
  );
}

function CodeCopyAction({
  code,
  onCopied,
}: {
  readonly code: string;
  readonly onCopied?: () => void;
}) {
  const { t } = useTranslation('chat');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopied?.();
    } catch (error) {
      console.error('Failed to copy code block:', error);
    }
  };

  return (
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
  );
}

export default memo(CodeBlock);
