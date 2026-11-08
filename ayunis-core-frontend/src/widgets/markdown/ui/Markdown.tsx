import { createContext, memo, useContext } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './Codeblock';
import PiiMaskInline from './PiiMaskInline';
import SourceCitationInline from './SourceCitationInline';
import UrlReferenceInline from './UrlReferenceInline';
import {
  protectUrlReferences,
  rehypeUrlReferences,
} from '@/widgets/markdown/lib/rehype-url-references';
import { rehypePiiMasks } from '@/widgets/markdown/lib/rehype-pii-masks';
import { rehypeLegalMarkers } from '@/widgets/markdown/lib/rehype-legal-markers';
import { rehypeSourceCitations } from '@/widgets/markdown/lib/rehype-source-citations';
import { protectSourceCitationPipes } from '@/widgets/markdown/lib/protect-source-citation-pipes';
import { remarkOpenCodeFences } from '@/widgets/markdown/lib/remark-open-code-fences';

// Module constants so react-markdown doesn't re-parse on every render.
const REMARK_PLUGINS = [remarkGfm];
const STREAMING_REMARK_PLUGINS = [remarkGfm, remarkOpenCodeFences];
const REHYPE_PLUGINS = [rehypePiiMasks];
const LEGAL_REHYPE_PLUGINS = [rehypePiiMasks, rehypeLegalMarkers];

interface MarkdownProps {
  children: string;
  className?: string;
  /** Defers highlighting of a trailing code block until its fence closes. */
  isStreaming?: boolean;
  renderLegalReferences?: boolean;
  renderSourceCitations?: boolean;
  renderUrlReferences?: boolean;
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
  'data-fence-open'?: string;
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
  'data-url-reference'?: string;
  title?: string;
}

const RenderImagesContext = createContext(true);

function MarkdownSpan(props: Readonly<SpanComponentProps>) {
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
}

function MarkdownCode({
  inline,
  className,
  children,
  'data-fence-open': fenceOpen,
}: Readonly<CodeComponentProps>) {
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
      highlight={fenceOpen !== 'true'}
    >
      {childrenStr}
    </CodeBlock>
  );
}

function MarkdownImage({ src, alt, title }: Readonly<ImageComponentProps>) {
  const renderImages = useContext(RenderImagesContext);
  if (!renderImages) return alt ? <span>{alt}</span> : null;
  return <img src={src} alt={alt ?? ''} title={title} />;
}

function MarkdownPre({ children }: Readonly<TableComponentProps>) {
  return (
    <div className="my-4" data-speech-text="">
      {children}
    </div>
  );
}

function MarkdownTable({ children }: Readonly<TableComponentProps>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto text-left">{children}</table>
    </div>
  );
}

function MarkdownTh({ children }: Readonly<TableComponentProps>) {
  return (
    <th className="px-2 py-2 font-semibold text-foreground text-left">
      {children}
    </th>
  );
}

function MarkdownTd({ children }: Readonly<TableComponentProps>) {
  return <td className="px-2 py-2 text-foreground">{children}</td>;
}

function MarkdownAnchor({
  href,
  children,
  'data-legal-reference': legalReference,
  'data-url-reference': urlReference,
  title,
}: Readonly<AnchorComponentProps>) {
  const isLegalReference = legalReference === 'true';
  if (urlReference === 'true') {
    return <UrlReferenceInline href={href}>{children}</UrlReferenceInline>;
  }
  return (
    <a
      href={href}
      title={title}
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
}

// Module scope so every render hands react-markdown the same component types;
// inline definitions would remount every custom node on each streamed update.
const COMPONENTS: Components = {
  span: MarkdownSpan,
  code: MarkdownCode,
  img: MarkdownImage,
  pre: MarkdownPre,
  table: MarkdownTable,
  th: MarkdownTh,
  td: MarkdownTd,
  a: MarkdownAnchor,
};

function Markdown({
  children,
  className = '',
  isStreaming = false,
  renderLegalReferences = false,
  renderSourceCitations = false,
  renderUrlReferences = false,
  renderImages = true,
}: Readonly<MarkdownProps>) {
  const urls = protectUrlReferences(renderUrlReferences ? children : '');
  const markdown = renderUrlReferences ? urls.markdown : children;
  const prepared = renderSourceCitations
    ? protectSourceCitationPipes(markdown)
    : { markdown };
  return (
    <div
      className={`text leading-relaxed prose prose-sm max-w-none dark:prose-invert ${className}`}
    >
      <RenderImagesContext.Provider value={renderImages}>
        <ReactMarkdown
          remarkPlugins={
            isStreaming ? STREAMING_REMARK_PLUGINS : REMARK_PLUGINS
          }
          rehypePlugins={resolveRehypePlugins(
            renderLegalReferences,
            renderSourceCitations,
            prepared.separator,
            urls.references,
          )}
          components={COMPONENTS}
        >
          {prepared.markdown}
        </ReactMarkdown>
      </RenderImagesContext.Provider>
    </div>
  );
}

function resolveRehypePlugins(
  renderLegalReferences: boolean,
  renderSourceCitations: boolean,
  separator?: string,
  references: ReturnType<typeof protectUrlReferences>['references'] = new Map(),
) {
  const base = renderLegalReferences ? LEGAL_REHYPE_PLUGINS : REHYPE_PLUGINS;
  const urlPlugin: [
    typeof rehypeUrlReferences,
    { references: typeof references },
  ] = [rehypeUrlReferences, { references }];
  const plugins = [...base];
  if (renderSourceCitations) {
    const sourcePlugin: [typeof rehypeSourceCitations, { separator?: string }] =
      [rehypeSourceCitations, { separator }];
    return references.size
      ? [...plugins, sourcePlugin, urlPlugin]
      : [...plugins, sourcePlugin];
  }
  return references.size ? [...plugins, urlPlugin] : plugins;
}

export default memo(Markdown);
