import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '../../model/openapi';
import { renderArtifactToolWidget } from './renderArtifactToolWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../api/useThreadArtifacts', () => ({
  useThreadArtifacts: () => ({
    artifacts: [
      {
        id: 'email-artifact-1',
        title: 'Order request',
        type: 'email',
        createdAt: '2026-08-18T12:00:00.000Z',
      },
    ],
  }),
}));

function toolUse(
  name: string,
  params: Record<string, unknown>,
): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: `${name}-1`,
    name,
    params,
  };
}

describe('renderArtifactToolWidget', () => {
  it('renders an open button for a created email artifact', () => {
    const onOpenArtifact = vi.fn();

    render(
      <>
        {renderArtifactToolWidget({
          content: toolUse('create_email', {
            subject: 'Order request',
            to: ['recipient@example.com'],
            body: 'Please send the order.',
          }),
          index: 0,
          threadId: 'thread-1',
          onOpenArtifact,
        })}
      </>,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.create_email.openInEditor',
      }),
    );

    expect(onOpenArtifact).toHaveBeenCalledWith('email-artifact-1');
  });

  it('renders an open button for an updated email artifact', () => {
    const onOpenArtifact = vi.fn();

    render(
      <>
        {renderArtifactToolWidget({
          content: toolUse('update_email', {
            artifact_id: 'email-artifact-1',
            subject: 'Updated order request',
          }),
          index: 0,
          threadId: 'thread-1',
          onOpenArtifact,
        })}
      </>,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.update_email.openInEditor',
      }),
    );

    expect(onOpenArtifact).toHaveBeenCalledWith('email-artifact-1');
  });
});
