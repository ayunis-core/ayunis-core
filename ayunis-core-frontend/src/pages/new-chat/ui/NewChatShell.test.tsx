import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { NewChatShell } from '@ayunis/chat/new-chat';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

describe('NewChatShell', () => {
  it('owns starter actions and the idle-to-settling presentation', () => {
    const onStarter = vi.fn();
    const { rerender } = render(
      <NewChatShell
        header={<div>Header</div>}
        greeting="Good morning"
        starterPrompts={[
          { id: 'reply', label: 'Prepare reply', onSelect: onStarter },
        ]}
        composer={<textarea aria-label="Prompt" />}
        supportingContent={<div>Notifications</div>}
        extras={<div>Pinned skills</div>}
        privacyHint="Private"
        disclaimer="AI can make mistakes"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Prepare reply' }));
    expect(onStarter).toHaveBeenCalledOnce();

    rerender(
      <NewChatShell
        header={<div>Header</div>}
        greeting="Good morning"
        isSettling
        starterPrompts={[
          { id: 'reply', label: 'Prepare reply', onSelect: onStarter },
        ]}
        composer={<textarea aria-label="Prompt" />}
        supportingContent={<div>Notifications</div>}
        extras={<div>Pinned skills</div>}
        privacyHint="Private"
        disclaimer="AI can make mistakes"
      />,
    );

    expect(screen.queryByRole('button', { name: 'Prepare reply' })).toBeNull();
    expect(
      screen.getByRole('heading', { hidden: true }).getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      screen.getByText('AI can make mistakes').getAttribute('aria-hidden'),
    ).toBe('false');
    expect(screen.getByLabelText('Prompt')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(
      screen
        .getByText('Pinned skills')
        .closest('[aria-hidden]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('does not invoke a disabled starter action', () => {
    const onStarter = vi.fn();
    render(
      <NewChatShell
        header={<div>Header</div>}
        greeting="Good morning"
        starterPrompts={[
          {
            id: 'summary',
            label: 'Summarize email',
            disabled: true,
            onSelect: onStarter,
          },
        ]}
        composer={<textarea aria-label="Prompt" />}
        privacyHint="Private"
        disclaimer="AI can make mistakes"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Summarize email' }));
    expect(onStarter).not.toHaveBeenCalled();
  });

  it('preserves the narrow-host presentation and landmark', () => {
    const { container, rerender } = render(
      <NewChatShell
        as="main"
        layout="narrow"
        header={<div>Header</div>}
        greeting="Good morning"
        composer={<textarea aria-label="Prompt" />}
        privacyHint="Private"
        disclaimer="AI can make mistakes"
      />,
    );

    expect(container.querySelector('main')).toBeTruthy();
    expect(screen.getByRole('heading').classList.contains('text-xl')).toBe(
      true,
    );
    expect(
      container
        .querySelector('.new-chat-input-stack')
        ?.classList.contains('z-20'),
    ).toBe(false);

    rerender(
      <NewChatShell
        as="main"
        layout="narrow"
        header={<div>Header</div>}
        greeting="Good morning"
        composer={<textarea aria-label="Prompt" />}
        privacyHint="Private"
        disclaimer="AI can make mistakes"
        isSettling
      />,
    );

    expect(screen.queryByText('Private')).toBeNull();
  });
});
