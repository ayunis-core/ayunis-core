import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ToolTimelineStep } from '@/pages/chat/ui/agent-run-timeline/model/types';
import ToolApprovalCard from './ToolApprovalCard';

const mutate = vi.fn();
const state = { isPending: false, isSuccess: false };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}));

vi.mock('@/pages/chat/api/useDecideToolApproval', () => ({
  useDecideToolApproval: () => ({ mutate, ...state }),
}));

const step: ToolTimelineStep = {
  kind: 'tool',
  key: 'tool-1',
  status: 'awaiting_approval',
  toolUse: {
    type: 'tool_use',
    id: 'call-42',
    name: 'mcp__tool__create_document__b0eb63cb',
    params: { title: 'Notes' },
    integration: {
      id: 'int',
      name: 'Outline',
      logoUrl: null,
      requiresApproval: true,
    },
  },
};

describe('ToolApprovalCard', () => {
  it('names the integration and tool and previews the arguments', () => {
    render(<ToolApprovalCard step={step} threadId="thread-7" />);

    expect(
      screen.getByText(
        'chat.timeline.approval.title:{"integration":"Outline","tool":"Create Document"}',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/"title": "Notes"/)).toBeTruthy();
  });

  it('sends the decision for the tool call', () => {
    render(<ToolApprovalCard step={step} threadId="thread-7" />);

    fireEvent.click(screen.getByTestId('tool-approval-approve'));
    fireEvent.click(screen.getByTestId('tool-approval-decline'));

    expect(mutate).toHaveBeenNthCalledWith(1, {
      threadId: 'thread-7',
      toolCallId: 'call-42',
      decision: 'approved',
    });
    expect(mutate).toHaveBeenNthCalledWith(2, {
      threadId: 'thread-7',
      toolCallId: 'call-42',
      decision: 'declined',
    });
  });

  it('disables both actions once a decision is on its way', () => {
    state.isPending = true;
    render(<ToolApprovalCard step={step} threadId="thread-7" />);

    expect(
      screen.getByTestId('tool-approval-approve').hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen.getByTestId('tool-approval-decline').hasAttribute('disabled'),
    ).toBe(true);
    state.isPending = false;
  });
});
