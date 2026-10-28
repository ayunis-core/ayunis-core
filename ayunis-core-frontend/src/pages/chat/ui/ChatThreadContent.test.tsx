import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '@/pages/chat/model/openapi';
import type { RenderUnit } from '@/pages/chat/ui/agent-run-timeline';
import { ChatThreadContent } from './ChatThreadContent';

vi.mock('@/pages/chat/ui/ChatMessage', () => ({
  default: ({ message }: { message: Message }) => (
    <div data-testid="rendered-user-message">{message.id}</div>
  ),
}));

vi.mock('@/pages/chat/ui/AssistantRunBlock', () => ({
  default: () => <div data-testid="rendered-agent-run" />,
}));

vi.mock('@/pages/chat/ui/LoadingAssistantBlock', () => ({
  default: () => <div data-testid="loading-assistant" />,
}));

const userUnit = (id: string): RenderUnit => ({
  kind: 'user',
  key: id,
  message: {
    id,
    role: 'user',
    content: [{ type: 'text', text: id }],
  } as unknown as Message,
});

const agentUnit: RenderUnit = {
  kind: 'agent-run',
  key: 'agent-run',
  blocks: [],
  isStreaming: false,
};

const baseProps = {
  threadId: 'thread-id',
  showLoadingPlaceholder: false,
  onOpenArtifact: vi.fn(),
};

describe('ChatThreadContent', () => {
  it('renders the context hint directly before the first persisted user message', () => {
    const { container } = render(
      <ChatThreadContent
        {...baseProps}
        renderUnits={[
          agentUnit,
          userUnit('first-user'),
          userUnit('second-user'),
        ]}
        pendingSubmission={null}
        contextHint={<div data-testid="context-hint" />}
      />,
    );

    const children = Array.from(container.firstElementChild?.children ?? []);
    expect(
      children.map((element) => element.getAttribute('data-testid')),
    ).toEqual([
      'rendered-agent-run',
      'context-hint',
      'rendered-user-message',
      'rendered-user-message',
    ]);
    expect(screen.getAllByTestId('context-hint')).toHaveLength(1);
  });

  it('renders the context hint before the pending first user message', () => {
    const { container } = render(
      <ChatThreadContent
        {...baseProps}
        renderUnits={[]}
        pendingSubmission="Pending message"
        contextHint={<div data-testid="context-hint" />}
      />,
    );

    const children = Array.from(container.firstElementChild?.children ?? []);
    expect(
      children.map((element) => element.getAttribute('data-testid')),
    ).toEqual(['context-hint', 'rendered-user-message']);
  });

  it('does not show the hint before the chat has a user message', () => {
    render(
      <ChatThreadContent
        {...baseProps}
        renderUnits={[]}
        pendingSubmission={null}
        contextHint={<div data-testid="context-hint" />}
      />,
    );

    expect(screen.queryByTestId('context-hint')).toBeNull();
  });
});
