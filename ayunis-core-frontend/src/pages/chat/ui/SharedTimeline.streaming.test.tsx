import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/pages/chat/model/openapi';
import { useRenderUnits } from '@ayunis/chat/timeline';
import AgentRunTimeline from '@/pages/chat/ui/agent-run-timeline/ui/AgentRunTimeline';
import { chatToolCards } from '@/pages/chat/ui/agent-run-timeline/lib/tool-card-registrations';

const markdownRenders = vi.hoisted(() => ({
  byText: new Map<string, number>(),
}));

vi.mock(
  '@/pages/chat/ui/agent-run-timeline/ui/AgentRunTimeline',
  async (importOriginal) => {
    const actual = await importOriginal<{ default: typeof AgentRunTimeline }>();
    return { default: vi.fn(actual.default) };
  },
);

vi.mock('@/widgets/markdown', () => ({
  Markdown: ({ children }: { children: string }) => {
    markdownRenders.byText.set(
      children,
      (markdownRenders.byText.get(children) ?? 0) + 1,
    );
    return <p>{children}</p>;
  },
  usePiiMasks: () => new Map(),
}));

vi.mock('@/pages/chat/ui/ReadAloudButton', () => ({
  default: () => null,
}));

function message(
  id: string,
  role: 'user' | 'assistant',
  text: string,
): Message {
  return {
    id,
    threadId: 'thread-id',
    role,
    content: [{ type: 'text', text }],
    createdAt: '2026-11-05T10:00:00.000Z',
  } as unknown as Message;
}

function Thread({
  messages,
  isStreaming,
}: Readonly<{ messages: Message[]; isStreaming: boolean }>) {
  const renderUnits = useRenderUnits(messages, {
    isStreaming,
    hasPendingUserTurn: false,
    toolCards: chatToolCards,
  });
  return (
    <>
      {renderUnits.map((unit) =>
        unit.kind === 'agent-run' ? (
          <AgentRunTimeline
            key={unit.key}
            unit={unit}
            threadId="thread-id"
            onOpenArtifact={onOpenArtifact}
          />
        ) : null,
      )}
    </>
  );
}

const onOpenArtifact = vi.fn();

function chartCall(params: Record<string, unknown>): Message {
  return {
    id: 'a3',
    threadId: 'thread-id',
    role: 'assistant',
    content: [{ type: 'tool_use', id: 'chart-1', name: 'bar_chart', params }],
    createdAt: '2026-11-05T10:00:00.000Z',
  } as unknown as Message;
}

function lastTimelineUnit(runKey: string) {
  return vi
    .mocked(AgentRunTimeline)
    .mock.calls.filter(([props]) => props.unit.key === runKey)
    .at(-1)?.[0].unit;
}

const history = [
  message('u1', 'user', 'Erste Frage'),
  message('a1', 'assistant', 'Erste Antwort'),
  message('u2', 'user', 'Zweite Frage'),
  message('a2', 'assistant', 'Zwischenstand'),
];

describe('shared timeline while an answer streams', () => {
  beforeEach(() => {
    vi.mocked(AgentRunTimeline).mockClear();
    markdownRenders.byText.clear();
  });

  it('reuses completed text while the streaming run changes', () => {
    const { rerender } = render(
      <Thread
        isStreaming
        messages={[...history, message('a3', 'assistant', 'Hal')]}
      />,
    );

    rerender(
      <Thread
        isStreaming
        messages={[...history, message('a3', 'assistant', 'Hallo')]}
      />,
    );

    expect(markdownRenders.byText.get('Zwischenstand')).toBe(1);
    expect(markdownRenders.byText.get('Hallo')).toBe(1);
  });

  it('keeps completed runs when the persisted thread replaces the streamed messages', () => {
    const streamed = [...history, message('a3', 'assistant', 'Hallo')];
    const { rerender } = render(<Thread isStreaming messages={streamed} />);

    rerender(
      <Thread isStreaming={false} messages={structuredClone(streamed)} />,
    );

    expect(markdownRenders.byText.get('Erste Antwort')).toBe(1);
    expect(markdownRenders.byText.get('Zwischenstand')).toBe(1);
  });

  it('updates a streamed tool call once its final message carries the params', () => {
    const { rerender } = render(
      <Thread isStreaming messages={[...history, chartCall({})]} />,
    );

    rerender(
      <Thread
        isStreaming
        messages={[...history, chartCall({ title: 'Einwohner' })]}
      />,
    );

    expect(lastTimelineUnit('run-a2')?.blocks.at(-1)).toMatchObject({
      kind: 'rich-tool',
      steps: [{ toolUse: { params: { title: 'Einwohner' } } }],
    });
  });
});
