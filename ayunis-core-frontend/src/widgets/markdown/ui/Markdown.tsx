import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./Codeblock";

interface MarkdownProps {
  children: string;
  className?: string;
}

function Markdown({ children, className = "" }: MarkdownProps) {
  return (
    <div
      className={`text leading-relaxed prose prose-sm max-w-none dark:prose-invert ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ inline, className, children }: any) => {
            // Multiple detection methods
            const hasLanguageClass =
              className && className.startsWith("language-");
            const isMultiline = String(children).includes("\n");
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
                    style={{ display: "inline" }}
                  >
                    {String(children)}
                  </code>
                </span>
              );
            }

            // For block code
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            return (
              <CodeBlock
                language={language}
                inline={false}
                className={className}
              >
                {String(children)}
              </CodeBlock>
            );
          },
          pre: ({ children }) => {
            return <div className="my-4">{children}</div>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-left">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-2 py-2 font-semibold text-foreground text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-2 text-foreground">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
