import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfiguredComposer } from '@ayunis/chat/surface';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const draft = { message: '', setMessage: vi.fn() };

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe('ConfiguredComposer canonical controls', () => {
  it('offers cancellation while the first submission is still in flight', () => {
    const onStop = vi.fn();
    render(
      <ConfiguredComposer
        compact
        threadId="draft"
        capabilities={{}}
        draft={draft}
        isSubmitting
        isStreaming={false}
        isCheckingForRun={false}
        onSend={vi.fn()}
        onStop={onStop}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'chatInput.cancelTooltip' }),
    );

    expect(onStop).toHaveBeenCalledOnce();
  });

  it('keeps host-fed skills inside the canonical plus menu', async () => {
    render(
      <ConfiguredComposer
        compact
        threadId="draft"
        capabilities={{ skills: true }}
        draft={draft}
        isStreaming={false}
        isCheckingForRun={false}
        onSend={vi.fn()}
        slots={{ skills: <div>Permit skill</div> }}
      />,
    );

    expect(screen.queryByText('Permit skill')).toBeNull();
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'chatInput.addButtonTooltip' }),
      { key: 'ArrowDown' },
    );
    expect(await screen.findByText('Permit skill')).toBeTruthy();
  });

  it('closes the plus menu when a run starts but uploads stay enabled', async () => {
    const composer = (isStreaming: boolean) => (
      <ConfiguredComposer
        compact
        threadId="draft"
        capabilities={{ skills: true }}
        adapters={{ allowAttachmentsWhileStreaming: true }}
        draft={draft}
        isStreaming={isStreaming}
        isCheckingForRun={false}
        onSend={vi.fn()}
        slots={{ skills: <div>Permit skill</div> }}
      />
    );
    const { rerender } = render(composer(false));
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'chatInput.addButtonTooltip' }),
      { key: 'ArrowDown' },
    );
    expect(await screen.findByText('Permit skill')).toBeTruthy();

    rerender(composer(true));

    await waitFor(() => expect(screen.queryByText('Permit skill')).toBeNull());
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'chatInput.addButtonTooltip',
      }).disabled,
    ).toBe(false);
  });

  it('hides uploads when the surface has no file-upload capability', async () => {
    render(
      <ConfiguredComposer
        compact
        threadId="draft"
        capabilities={{ skills: true }}
        adapters={{
          imageAttachments: true,
          documentAttachments: true,
          uploadFiles: vi.fn(),
        }}
        draft={draft}
        isStreaming={false}
        isCheckingForRun={false}
        onSend={vi.fn()}
        slots={{ skills: <div>Permit skill</div> }}
      />,
    );
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'chatInput.addButtonTooltip' }),
      { key: 'ArrowDown' },
    );
    expect(await screen.findByText('Permit skill')).toBeTruthy();

    expect(
      screen.queryByRole('menuitem', { name: 'chatInput.uploadFile' }),
    ).toBeNull();
  });
});
