import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ChatSurface,
  type ChatSlots,
  type ChatSurfaceConfig,
} from '@ayunis/chat/surface';
import { ChatComposer } from '@ayunis/chat/composer';
import { Markdown } from '@ayunis/chat/markdown';
import { executeRun } from '@ayunis/chat/runs';

function MinimalChat({
  config,
  slots,
}: Readonly<{ config: ChatSurfaceConfig; slots: ChatSlots }>) {
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const noop = () => undefined;

  function send() {
    void executeRun(
      config.transport,
      { threadId: 'thread-1', text },
      {
        onEvent: (event) => {
          if (event.type !== 'message') return;
          const content = event.message.content[0];
          if (content?.type === 'text' && 'text' in content) {
            setAnswer(content.text);
          }
        },
        onUnauthorized: noop,
        onError: noop,
        onCleanup: noop,
        onAbort: noop,
        onComplete: noop,
      },
    );
  }

  return (
    <ChatSurface
      slots={slots}
      empty={!answer}
      renderContent={(openArtifact) => (
        <>
          <Markdown>{answer}</Markdown>
          <button type="button" onClick={() => openArtifact?.('artifact-1')}>
            Open preview
          </button>
        </>
      )}
      composer={
        <ChatComposer
          state="idle"
          dragging={false}
          animateHeight={false}
          textarea={{
            'aria-label': 'Prompt',
            value: text,
            onChange: (event) => setText(event.target.value),
          }}
          images={[]}
          onRemoveImage={noop}
          actions={
            <>
              {config.capabilities.fileUpload && (
                <input type="file" aria-label="Upload file" />
              )}
              <button type="button" onClick={send}>
                Send
              </button>
            </>
          }
        />
      }
    />
  );
}

describe('chat surface composition', () => {
  it('leaves the viewport unobstructed when a conditional header renders nothing', () => {
    const { container } = render(
      <ChatSurface
        slots={{ header: () => false }}
        renderContent={() => <p>Conversation</p>}
        composer={<p>Composer</p>}
      />,
    );

    expect(container.querySelector('.content-scroll-header')).toBeNull();
    expect(container.querySelector('.content-scroll-header-offset')).toBeNull();
  });

  it('sends and renders through the host transport with only its enabled controls and slots', async () => {
    const send = vi.fn(async () => {
      const event = {
        type: 'message',
        message: { content: [{ type: 'text', text: '**Streamed answer**' }] },
      };
      return new Response(`data: ${JSON.stringify(event)}\n\n`);
    });
    const openArtifact = vi.fn();
    const headerAction = vi.fn();

    render(
      <MinimalChat
        config={{ transport: { send }, capabilities: {} }}
        slots={{
          header: (actions) => <header>{actions}</header>,
          actions: (
            <button type="button" onClick={headerAction}>
              Host action
            </button>
          ),
          emptyState: <p>Ready for a prompt</p>,
          onOpenArtifact: openArtifact,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Host action' }));
    expect(headerAction).toHaveBeenCalledOnce();
    expect(screen.getByText('Ready for a prompt')).toBeTruthy();
    expect(screen.queryByLabelText('Upload file')).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
      target: { value: 'Hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(send).toHaveBeenCalledWith(
      { threadId: 'thread-1', text: 'Hello' },
      expect.any(AbortSignal),
    );

    expect(await screen.findByText('Streamed answer')).toBeTruthy();
    expect(screen.queryByText('Ready for a prompt')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open preview' }));
    expect(openArtifact).toHaveBeenCalledWith('artifact-1');
  });
});
