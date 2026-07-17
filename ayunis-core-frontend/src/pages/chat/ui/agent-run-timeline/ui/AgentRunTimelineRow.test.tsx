import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TimelineStep } from '../model/types';
import AgentRunTimelineRow from './AgentRunTimelineRow';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/widgets/markdown', () => ({
  PiiText: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function toolStep(status: 'streaming' | 'invalid'): TimelineStep {
  return {
    kind: 'tool',
    key: 'tool-1',
    status: status === 'invalid' ? 'error' : 'in_progress',
    toolUse: {
      type: 'tool_use',
      id: 'tool-1',
      name: '',
      params: {},
      stream: {
        status,
        argumentsJson: '{"query":"part',
      },
    },
  };
}

describe('AgentRunTimelineRow', () => {
  it('shows accumulated raw arguments while a tool call is streaming', () => {
    render(<AgentRunTimelineRow step={toolStep('streaming')} />);

    fireEvent.click(screen.getByText('chat.timeline.preparingToolCall'));

    expect(screen.getByText('{"query":"part')).toBeTruthy();
  });

  it('labels an invalid tool call as an error while keeping its raw input', () => {
    render(<AgentRunTimelineRow step={toolStep('invalid')} />);

    fireEvent.click(screen.getByText('chat.timeline.invalidToolCall'));

    expect(screen.getByText('{"query":"part')).toBeTruthy();
  });
});
