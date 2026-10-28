import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatInputToolbar } from './ChatInputToolbar';

describe(ChatInputToolbar.name, () => {
  it('lets the model selector shrink so send stays visible on narrow viewports', () => {
    render(
      <ChatInputToolbar
        leading={<button type="button">plus</button>}
        modelSelector={<button type="button">model</button>}
        trailing={<button type="button">send</button>}
      />,
    );

    const toolbar = screen.getByTestId('chat-input-toolbar');
    const modelSlot = screen.getByRole('button', {
      name: 'model',
    }).parentElement;

    expect(toolbar.className).toContain('min-w-0');
    expect(modelSlot?.className).toContain('min-w-0');
    expect(modelSlot?.className).toContain('flex-1');
  });
});
