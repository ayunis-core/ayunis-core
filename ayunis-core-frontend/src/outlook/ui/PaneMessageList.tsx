import { useEffect, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isOutlookTool } from '@/outlook/lib/outlook-tools';
import type { PaneMessage } from '@/outlook/lib/pane-messages';
import type { PaneToolState } from '@/outlook/lib/use-pane-chat';
import { PaneToolCard } from '@/outlook/ui/PaneToolCard';

// A link followed inside the pane would replace the pane itself.
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

type AssistantContent = Extract<
  PaneMessage,
  { role: 'assistant' }
>['content'][number];

function AssistantPart({
  part,
  toolStates,
}: Readonly<{
  part: AssistantContent;
  toolStates: Record<string, PaneToolState>;
}>) {
  if (part.type === 'text' && 'text' in part) {
    return (
      <div className="pane-markdown text-sm leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={MARKDOWN_COMPONENTS}
        >
          {part.text}
        </ReactMarkdown>
      </div>
    );
  }
  if (part.type === 'tool_use' && 'name' in part && isOutlookTool(part.name)) {
    return (
      <PaneToolCard
        call={{
          id: part.id,
          name: part.name,
          params: part.params,
        }}
        state={toolStates[part.id]}
      />
    );
  }
  return null;
}

function MessageItem({
  message,
  toolStates,
}: Readonly<{
  message: PaneMessage;
  toolStates: Record<string, PaneToolState>;
}>) {
  if (message.role === 'user') {
    const text = message.content
      .map((part) => ('text' in part ? part.text : ''))
      .join('\n');
    return (
      <div
        className="ml-8 self-end rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap"
        data-testid="outlook-pane-user-message"
      >
        {text}
      </div>
    );
  }
  if (message.role !== 'assistant') return null;
  return (
    <div
      className="flex flex-col gap-2"
      data-testid="outlook-pane-assistant-message"
    >
      {message.content.map((part, index) => (
        <AssistantPart
          key={'id' in part ? part.id : index}
          part={part}
          toolStates={toolStates}
        />
      ))}
    </div>
  );
}

export function PaneMessageList({
  messages,
  toolStates,
}: Readonly<{
  messages: PaneMessage[];
  toolStates: Record<string, PaneToolState>;
}>) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages, toolStates]);

  return (
    <div className="flex flex-col gap-4" data-testid="outlook-pane-messages">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          toolStates={toolStates}
        />
      ))}
      <div ref={end} />
    </div>
  );
}
