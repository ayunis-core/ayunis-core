import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfirmationModal,
  ConfirmationProvider,
  useConfirmation,
} from '@/widgets/confirmation-modal';

function Harness({
  onConfirm,
  onCancel,
}: Readonly<{ onConfirm: () => Promise<void>; onCancel: () => void }>) {
  const { confirm } = useConfirmation();
  return (
    <button
      onClick={() =>
        confirm({ title: 'Leave?', description: '', onConfirm, onCancel })
      }
    >
      open
    </button>
  );
}

describe('ConfirmationModal', () => {
  it('does not report a cancel when dismissed while the confirmation is running', async () => {
    let finishSave!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    const onCancel = vi.fn();
    render(
      <ConfirmationProvider>
        <Harness onConfirm={onConfirm} onCancel={onCancel} />
        <ConfirmationModal />
      </ConfirmationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(screen.getByTestId('confirmation-confirm'));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await act(async () => finishSave());

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps open a confirmation that the confirmed one opened, e.g. a warning after the unsaved-changes prompt', async () => {
    const onSecondConfirm = vi.fn();
    function ChainHarness() {
      const { confirm } = useConfirmation();
      return (
        <button
          onClick={() =>
            confirm({
              title: 'Save?',
              description: '',
              onConfirm: () => {
                // The first confirmation resolves a promise; its continuation
                // asks the next question.
                void Promise.resolve().then(() =>
                  confirm({
                    title: 'Convert?',
                    description: '',
                    onConfirm: onSecondConfirm,
                  }),
                );
              },
            })
          }
        >
          open
        </button>
      );
    }
    render(
      <ConfirmationProvider>
        <ChainHarness />
        <ConfirmationModal />
      </ConfirmationProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmation-confirm'));
      await Promise.resolve();
    });

    expect(screen.getByRole('dialog').textContent).toContain('Convert?');
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirmation-confirm'));
      await Promise.resolve();
    });
    expect(onSecondConfirm).toHaveBeenCalledOnce();
  });
});
