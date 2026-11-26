import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ChatAttachments } from '@ayunis/chat/attachments';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { TooltipProvider } from '@ayunis/ui/components/tooltip';
import de from '@/shared/locales/de/common.json';
import en from '@/shared/locales/en/common.json';

const LONG_SOURCE_NAME =
  'Benutzungs- und Gebu\u0308hrenordnung fu\u0308r o\u0308ffentliche Einrichtungen.pdf';

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

afterEach(cleanup);

describe('ChatAttachments', () => {
  it.each(['de', 'en'])(
    'localizes failed PDF guidance in %s and preserves removal in the current chat',
    async (language) => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        resources: { de: { common: de }, en: { common: en } },
        defaultNS: 'common',
      });
      const onRemoveSource = vi.fn();
      render(
        <I18nextProvider i18n={i18n}>
          <TooltipProvider delayDuration={0}>
            <ChatAttachments
              sources={[
                {
                  id: 'invoice-source',
                  name: 'Rechnung.pdf',
                  type: 'text',
                  status: 'failed',
                  processingErrorCode: 'DOCUMENT_UNREADABLE',
                },
              ]}
              onRemoveSource={onRemoveSource}
            />
          </TooltipProvider>
        </I18nextProvider>,
      );

      fireEvent.pointerMove(screen.getByText('Rechnung.pdf'));
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toContain(
        language === 'de'
          ? 'Diese Datei konnte nicht gelesen werden. Entfernen Sie sie und laden Sie sie erneut hoch.'
          : 'Couldn’t read this file. Remove it and try uploading it again.',
      );
      expect(tooltip.textContent).not.toContain(
        'The document could not be processed',
      );
      const content = tooltip.closest('[data-slot="tooltip-content"]');
      expect(content?.getAttribute('data-align')).toBe('start');
      fireEvent.click(screen.getByTestId('chat-source-remove'));
      expect(onRemoveSource).toHaveBeenCalledWith('invoice-source');
    },
  );

  it('shows processing sources as removable and transfer progress as non-removable', () => {
    const onRemoveSource = vi.fn();
    const { rerender } = render(
      <ChatAttachments
        sources={[
          {
            id: 'minutes',
            name: 'Protokoll.pdf',
            type: 'text',
            status: 'processing',
          },
        ]}
        onRemoveSource={onRemoveSource}
      />,
    );

    expect(screen.queryByTestId('chat-source-upload-spinner')).toBeNull();
    fireEvent.click(screen.getByTestId('chat-source-remove'));
    expect(onRemoveSource).toHaveBeenCalledWith('minutes');

    rerender(
      <ChatAttachments
        sources={[
          {
            id: 'minutes',
            name: 'Protokoll.pdf',
            type: 'text',
            status: 'processing',
            uploadProgress: 0.4,
          },
        ]}
        onRemoveSource={onRemoveSource}
      />,
    );

    expect(screen.getByTestId('chat-source-upload-spinner')).toBeTruthy();
    expect(screen.queryByTestId('chat-source-remove')).toBeNull();
  });

  it('never exposes an untrusted provider diagnostic for an unknown failure', async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: 'en',
      resources: { en: { common: en } },
      defaultNS: 'common',
    });
    const source = {
      id: 'invoice-source',
      name: 'Invoice.pdf',
      type: 'text' as const,
      status: 'failed' as const,
      processingError: 'Internal database failure: secret',
    };
    render(
      <I18nextProvider i18n={i18n}>
        <TooltipProvider delayDuration={0}>
          <ChatAttachments
            sources={[source]}
            onRemoveSource={() => undefined}
          />
        </TooltipProvider>
      </I18nextProvider>,
    );

    fireEvent.focus(screen.getByTestId('chat-source'));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('upload it again');
    expect(tooltip.textContent).not.toContain('secret');
  });

  it('renders context attachments and source names through the shared layout', async () => {
    const onRemoveKnowledgeBase = vi.fn();
    const onRemoveIntegration = vi.fn();
    const i18n = createInstance();
    await i18n.init({
      lng: 'en',
      resources: { en: { common: en } },
      defaultNS: 'common',
    });
    render(
      <I18nextProvider i18n={i18n}>
        <ChatAttachments
          sources={[{ id: 'source-1', name: LONG_SOURCE_NAME, type: 'text' }]}
          knowledgeBases={[{ id: 'kb-1', name: 'Council knowledge' }]}
          integrations={[{ id: 'mcp-1', name: 'Registry' }]}
          onRemoveSource={() => undefined}
          onRemoveKnowledgeBase={onRemoveKnowledgeBase}
          onRemoveIntegration={onRemoveIntegration}
        />
      </I18nextProvider>,
    );

    expect(screen.getByText(LONG_SOURCE_NAME).textContent).toBe(
      LONG_SOURCE_NAME,
    );
    expect(screen.getByText('Council knowledge')).toBeTruthy();
    expect(screen.getByText('Registry')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove file Council knowledge',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove file Registry' }),
    );
    expect(onRemoveKnowledgeBase).toHaveBeenCalledWith('kb-1');
    expect(onRemoveIntegration).toHaveBeenCalledWith('mcp-1');
  });
});
