import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatHistoryDeleteAction, RenameThreadDialog } from './ThreadDialogs';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.style.pointerEvents = '';
});

describe('ChatHistoryDeleteAction', () => {
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
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(document.body.style.pointerEvents).toBe('');
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
