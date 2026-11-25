import { fireEvent, render, screen } from '@testing-library/react';
import type { AssistantMessageResponseDto } from '@ayunis/api-client/schemas';
import {
  createToolCardRegistry,
  type ToolCardProps,
} from '@ayunis/chat/tool-cards';
import { AgentRunTimeline, useRenderUnits } from '@ayunis/chat/timeline';
import { expect, it, vi } from 'vitest';

function Card({ toolUse, onOpenArtifact }: Readonly<ToolCardProps>) {
  return (
    <button onClick={() => onOpenArtifact?.(toolUse.id)}>Open preview</button>
  );
}

const toolCards = createToolCardRegistry({ preview: { render: Card } });
const messages: AssistantMessageResponseDto[] = [
  {
    role: 'assistant',
    id: 'message',
    threadId: 'thread',
    createdAt: '2026-01-01T00:00:00.000Z',
    content: [
      { type: 'tool_use', id: 'preview-id', name: 'preview', params: {} },
    ],
  },
];

function TestHost({
  onOpenArtifact,
}: Readonly<{ onOpenArtifact: (id: string) => void }>) {
  const [unit] = useRenderUnits(messages, {
    isStreaming: false,
    hasPendingUserTurn: false,
    toolCards,
  });
  if (unit?.kind !== 'agent-run') return null;
  return (
    <AgentRunTimeline
      unit={unit}
      presentation={{ toolCards }}
      onOpenArtifact={onOpenArtifact}
    />
  );
}

it('renders a registered card from the supplied messages and opens it through the host callback', () => {
  const open = vi.fn();
  render(<TestHost onOpenArtifact={open} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open preview' }));
  expect(open).toHaveBeenCalledExactlyOnceWith('preview-id');
});
