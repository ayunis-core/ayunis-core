import { memo } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './Codeblock';
import PiiMaskInline from './PiiMaskInline';
import SourceCitationInline from './SourceCitationInline';
import { rehypePiiMasks } from '@/widgets/markdown/lib/rehype-pii-masks';
import { rehypeLegalMarkers } from '@/widgets/markdown/lib/rehype-legal-markers';
import { rehypeSourceCitations } from '@/widgets/markdown/lib/rehype-source-citations';

// Module constants so react-markdown doesn't re-parse on every render.
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypePiiMasks];
const LEGAL_REHYPE_PLUGINS = [rehypePiiMasks, rehypeLegalMarkers];
const SOURCE_REHYPE_PLUGINS = [rehypePiiMasks, rehypeSourceCitations];
const LEGAL_SOURCE_REHYPE_PLUGINS = [
  rehypePiiMasks,
  rehypeLegalMarkers,
  rehypeSourceCitations,
];

interface MarkdownProps {
  children: string;
  className?: string;
  renderLegalReferences?: boolean;
  renderSourceCitations?: boolean;
  renderImages?: boolean;
}

interface SpanComponentProps {
  children?: ReactNode;
  // react-markdown delivers hast data attributes in kebab-case.
  'data-pii-token'?: string;
  'data-source-citation'?: string;
  'data-source-chunk-id'?: string;
  'data-source-label'?: string;
}

interface CodeComponentProps {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

interface ImageComponentProps {
  src?: string;
  alt?: string;
  title?: string;
}

interface TableComponentProps {
  children?: ReactNode;
}

interface AnchorComponentProps {
  href?: string;
  children?: ReactNode;
  'data-legal-reference'?: string;
}

function Markdown({
  children,
  className = '',
  renderLegalReferences = false,
  renderSourceCitations = false,
  renderImages = true,
}: Readonly<MarkdownProps>) {
  return (
    <div
      className={`text leading-relaxed prose prose-sm max-w-none dark:prose-invert ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={resolveRehypePlugins(
          renderLegalReferences,
          renderSourceCitations,
        )}
        components={{
          span: (props: SpanComponentProps) => {
            const token = props['data-pii-token'];
            if (typeof token === 'string') {
              return <PiiMaskInline token={token} />;
            }
            const isSourceCitation = props['data-source-citation'] === 'true';
            const chunkId = props['data-source-chunk-id'];
            const label = props['data-source-label'];
            if (
              isSourceCitation &&
              typeof chunkId === 'string' &&
              typeof label === 'string'
            ) {
              return <SourceCitationInline citation={{ chunkId, label }} />;
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
          img: ({ src, alt, title }: ImageComponentProps) => {
            if (!renderImages) return alt ? <span>{alt}</span> : null;
            return <img src={src} alt={alt ?? ''} title={title} />;
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
          a: ({
            href,
            children,
            'data-legal-reference': legalReference,
          }: AnchorComponentProps) => {
            const isLegalReference = legalReference === 'true';
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isLegalReference
                    ? 'bg-muted text-foreground px-1 py-0.5 rounded font-medium'
                    : undefined
                }
                data-testid={isLegalReference ? 'legal-reference' : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function resolveRehypePlugins(
  renderLegalReferences: boolean,
  renderSourceCitations: boolean,
) {
  if (renderLegalReferences && renderSourceCitations) {
    return LEGAL_SOURCE_REHYPE_PLUGINS;
  }
  if (renderLegalReferences) return LEGAL_REHYPE_PLUGINS;
  if (renderSourceCitations) return SOURCE_REHYPE_PLUGINS;
  return REHYPE_PLUGINS;
}

export default memo(Markdown);
