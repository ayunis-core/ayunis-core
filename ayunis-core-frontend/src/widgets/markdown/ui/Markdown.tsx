import { memo } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './Codeblock';
import PiiMaskInline from './PiiMaskInline';
import { rehypePiiMasks } from '../lib/rehype-pii-masks';

// Module constants so react-markdown doesn't re-parse on every render.
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypePiiMasks];

interface MarkdownProps {
  children: string;
  className?: string;
}

interface SpanComponentProps {
  children?: ReactNode;
  // react-markdown delivers hast data attributes in kebab-case.
  'data-pii-token'?: string;
}

interface CodeComponentProps {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

interface TableComponentProps {
  children?: ReactNode;
}

interface AnchorComponentProps {
  href?: string;
  children?: ReactNode;
}

function Markdown({ children, className = '' }: Readonly<MarkdownProps>) {
  return (
    <div
      className={`text leading-relaxed prose prose-sm max-w-none dark:prose-invert ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={{
          span: (props: SpanComponentProps) => {
            const token = props['data-pii-token'];
            if (typeof token === 'string') {
              return <PiiMaskInline token={token} />;
            }
            return <span>{props.children}</span>;
          },
          code: ({ inline, className, children }: CodeComponentProps) => {
            // Convert children to string safely
            const childrenStr =
              typeof children === 'string' || typeof children === 'number'
                ? String(children)
                : '';

            // Multiple detection methods
            const hasLanguageClass = className?.startsWith('language-');
            const isMultiline = childrenStr.includes('\n');
            const isExplicitlyInline = inline === true;

            // More defensive inline detection
            if (
              isExplicitlyInline ||
              (!hasLanguageClass && !isMultiline && inline !== false)
            ) {
              return (
                <span className="not-prose">
                  <code
                    className="bg-muted px-1 py-0.5 rounded text-sm font-mono"
                    style={{ display: 'inline' }}
                  >
                    {childrenStr}
                  </code>
                </span>
              );
            }

            // For block code
            const match = /language-(\w+)/.exec(className ?? '');
            const language = match ? match[1] : '';

            return (
              <CodeBlock
                language={language}
                inline={false}
                className={className ?? ''}
              >
                {childrenStr}
              </CodeBlock>
            );
          },
          pre: ({ children }: TableComponentProps) => {
            return <div className="my-4">{children}</div>;
          },
          table: ({ children }: TableComponentProps) => (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left">{children}</table>
            </div>
          ),
          th: ({ children }: TableComponentProps) => (
            <th className="px-2 py-2 font-semibold text-foreground text-left">
              {children}
            </th>
          ),
          td: ({ children }: TableComponentProps) => (
            <td className="px-2 py-2 text-foreground">{children}</td>
          ),
          a: ({ href, children }: AnchorComponentProps) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
