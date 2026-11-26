import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatHistoryDeleteAction,
  ChatHistoryEmptyState,
  ChatHistoryError,
  ChatHistoryLoading,
  ChatHistoryPagination,
  RenameThreadDialog,
} from '@ayunis/chat/history';
import { AcademyGateNotice } from '@ayunis/chat/model-presentation';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.style.pointerEvents = '';
});

describe('ChatHistoryPagination', () => {
  it('delegates page changes without navigating inside the package', () => {
    const onPage = vi.fn();
    render(
      <ChatHistoryPagination currentPage={2} totalPages={3} onPage={onPage} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Go to previous page' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(onPage.mock.calls).toEqual([[1], [3]]);
  });

  it('gives a host renderer the exact page target and selection callback', () => {
    const onPage = vi.fn();
    render(
      <ChatHistoryPagination
        currentPage={2}
        totalPages={3}
        onPage={onPage}
        renderControl={(control) => (
          <button
            type="button"
            aria-label={control.label}
            data-page={control.page}
            onClick={control.onSelect}
          >
            {control.children}
          </button>
        )}
      />,
    );

    const previous = screen.getByRole('button', {
      name: 'Go to previous page',
    });
    expect(previous.getAttribute('data-page')).toBe('1');
    expect(
      screen
        .getByRole('button', { name: 'Go to next page' })
        .getAttribute('data-page'),
    ).toBe('3');
    fireEvent.click(previous);
    expect(onPage).toHaveBeenCalledWith(1);
  });
});

describe('ChatHistoryDeleteAction', () => {
  it('preserves the host-selected dismissible dialog behavior', () => {
    const onDelete = vi.fn();
    render(<ChatHistoryDeleteAction title="Chat" onDelete={onDelete} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'card.confirmDelete.title' }),
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    fireEvent.click(screen.getByTestId('confirmation-confirm'));
    expect(onDelete).toHaveBeenCalledOnce();

    cleanup();
    render(
      <ChatHistoryDeleteAction
        title="Chat"
        dismissible={false}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'card.confirmDelete.title' }),
    );
    expect(
      screen.getByRole('heading', { name: 'card.confirmDelete.title' }),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('restores page interactions after dismissing the delete dialog', () => {
    vi.useFakeTimers();
    render(<ChatHistoryDeleteAction title="Chat" onDelete={vi.fn()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'card.confirmDelete.title' }),
    );
    document.body.style.pointerEvents = 'none';

    fireEvent.click(screen.getByTestId('confirmation-cancel'));
    setTimeout(() => {
      document.body.style.pointerEvents = 'none';
    }, 50);
    act(() => vi.advanceTimersByTime(300));

    expect(document.body.style.pointerEvents).toBe('');
  });
});

describe('chat history states', () => {
  it('renders host copy and delegates retry and empty-state actions', () => {
    const onRetry = vi.fn();
    const onStart = vi.fn();
    render(
      <>
        <ChatHistoryLoading label="Loading chats" />
        <ChatHistoryError
          message="Could not load chats"
          retryLabel="Try again"
          onRetry={onRetry}
        />
        <ChatHistoryEmptyState
          title="No chats"
          description="Start a conversation"
          action={<button onClick={onStart}>Start chat</button>}
        />
      </>,
    );

    expect(screen.getByRole('status').textContent).toBe('Loading chats');
    expect(screen.getByRole('alert').textContent).toBe('Could not load chats');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledOnce();
  });
});

describe('RenameThreadDialog', () => {
  it('focuses and selects the current title when it opens', () => {
    render(
      <RenameThreadDialog
        open
        currentTitle="Old title"
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
      />,
    );

    const input = screen.getByTestId<HTMLInputElement>('rename-input');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Old title'.length);
  });

  it('preserves an in-progress edit and seeds the latest title on reopen', () => {
    const props = {
      onOpenChange: vi.fn(),
      onRename: vi.fn(),
    };
    const { rerender } = render(
      <RenameThreadDialog open currentTitle="Old title" {...props} />,
    );
    fireEvent.change(screen.getByTestId('rename-input'), {
      target: { value: 'In-progress edit' },
    });

    rerender(
      <RenameThreadDialog open currentTitle="Generated title" {...props} />,
    );
    expect(screen.getByTestId<HTMLInputElement>('rename-input').value).toBe(
      'In-progress edit',
    );

    rerender(
      <RenameThreadDialog
        open={false}
        currentTitle="Generated title"
        {...props}
      />,
    );
    expect(screen.queryByTestId('rename-input')).toBeNull();
    rerender(
      <RenameThreadDialog open currentTitle="Generated title" {...props} />,
    );
    expect(screen.getByTestId<HTMLInputElement>('rename-input').value).toBe(
      'Generated title',
    );
  });

  it('submits only a trimmed title within the shared length contract', () => {
    const onRename = vi.fn();
    const { rerender } = render(
      <RenameThreadDialog
        open
        currentTitle="Old title"
        onOpenChange={vi.fn()}
        onRename={onRename}
      />,
    );
    const input = screen.getByTestId('rename-input');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(screen.getByTestId('rename-submit').closest('form')!);
    expect(onRename).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '  New title  ' } });
    fireEvent.submit(screen.getByTestId('rename-submit').closest('form')!);
    expect(onRename).toHaveBeenCalledWith('New title');

    rerender(
      <RenameThreadDialog
        open={false}
        currentTitle={'x'.repeat(201)}
        onOpenChange={vi.fn()}
        onRename={onRename}
      />,
    );
    rerender(
      <RenameThreadDialog
        open
        currentTitle={'x'.repeat(201)}
        onOpenChange={vi.fn()}
        onRename={onRename}
      />,
    );
    fireEvent.submit(screen.getByTestId('rename-submit').closest('form')!);
    expect(onRename).toHaveBeenCalledTimes(1);
  });
});

describe('AcademyGateNotice', () => {
  it('shows the navigation action only when the host can fulfill it', () => {
    const onOpenAcademy = vi.fn();
    const { rerender } = render(
      <AcademyGateNotice onOpenAcademy={onOpenAcademy} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onOpenAcademy).toHaveBeenCalledOnce();

    rerender(<AcademyGateNotice />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
