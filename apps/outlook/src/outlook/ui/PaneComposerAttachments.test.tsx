import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfiguredComposer } from '@ayunis/chat/surface';
import { expect, it, vi } from 'vitest';

it('skips an image selected with a document when the selected model cannot use images', async () => {
  const uploadFiles = vi.fn(async () => undefined);
  const onAttachmentError = vi.fn();
  render(
    <ConfiguredComposer
      compact
      threadId="sample-thread"
      capabilities={{ fileUpload: true }}
      draft={{ message: '', setMessage: vi.fn() }}
      adapters={{
        uploadFiles,
        imageAttachments: false,
        documentAttachments: true,
        onAttachmentError,
      }}
      isStreaming={false}
      isCheckingForRun={false}
      onSend={vi.fn()}
    />,
  );

  const document = new File(['sample'], 'notes.txt', { type: 'text/plain' });
  const image = new File(['sample'], 'screen.png', { type: 'image/png' });
  fireEvent.change(screen.getByTestId('chat-attach-files'), {
    target: { files: [document, image] },
  });

  await waitFor(() => {
    expect(uploadFiles).toHaveBeenCalledExactlyOnceWith(
      'sample-thread',
      [document],
      expect.any(AbortSignal),
    );
    expect(onAttachmentError).toHaveBeenCalledOnce();
  });
});

it('keeps documents disabled while resolved image support remains available', async () => {
  const uploadFiles = vi.fn(async () => undefined);
  const onAttachmentError = vi.fn();
  render(
    <ConfiguredComposer
      compact
      threadId="sample-thread"
      capabilities={{ fileUpload: true }}
      draft={{ message: '', setMessage: vi.fn() }}
      adapters={{
        uploadFiles,
        imageAttachments: true,
        documentAttachments: undefined,
        onAttachmentError,
      }}
      isStreaming={false}
      isCheckingForRun={false}
      onSend={vi.fn()}
    />,
  );

  const picker = screen.getByTestId('chat-attach-files') as HTMLInputElement;
  expect(picker.disabled).toBe(false);
  expect(picker.accept).toBe('image/*');

  const document = new File(['sample'], 'notes.txt', { type: 'text/plain' });
  const image = new File(['sample'], 'screen.png', { type: 'image/png' });
  fireEvent.change(picker, { target: { files: [document, image] } });

  await waitFor(() => {
    expect(screen.getByAltText('screen.png')).toBeTruthy();
    expect(uploadFiles).not.toHaveBeenCalled();
    expect(onAttachmentError).toHaveBeenCalledOnce();
  });
});
