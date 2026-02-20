import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  oneDark,
  oneLight,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/features/theme';

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

  if (inline) {
    return (
      <code
        className={`${className} bg-muted px-1 py-0.5 rounded text-sm font-mono`}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="overflow-x-auto my-4 max-w-full">
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
        {children.replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
}
