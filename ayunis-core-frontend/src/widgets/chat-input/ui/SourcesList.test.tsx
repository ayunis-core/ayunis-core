import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SourcesList } from './SourcesList';
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

describe('SourcesList', () => {
  it.each(['de', 'en'])(
    'localizes failed PDF guidance in %s and preserves removal in the current chat',
    async (language) => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        resources: { de: { common: de }, en: { common: en } },
        defaultNS: 'common',
      });
      const onRemove = vi.fn();
      render(
        <I18nextProvider i18n={i18n}>
          <TooltipProvider delayDuration={0}>
            <SourcesList
              sources={[
                {
                  id: 'invoice-source',
                  name: 'Rechnung.pdf',
                  type: 'text',
                  status: 'failed',
                  processingError: 'Private provider diagnostic',
                  processingErrorCode: 'DOCUMENT_UNREADABLE',
                },
              ]}
              onRemove={onRemove}
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
      expect(tooltip.textContent).not.toContain('Private provider diagnostic');
      const content = tooltip.closest('[data-slot="tooltip-content"]');
      expect(content?.getAttribute('data-align')).toBe('start');
      fireEvent.click(screen.getByTestId('chat-source-remove'));
      expect(onRemove).toHaveBeenCalledWith('invoice-source');
    },
  );

  it.each([
    undefined,
    'Internal database failure: secret',
    'The document could not be processed',
  ])(
    'shows safe localized guidance even for a missing or unknown failure',
    async (processingError) => {
      const i18n = createInstance();
      await i18n.init({
        lng: 'de',
        resources: { de: { common: de } },
        defaultNS: 'common',
      });
      render(
        <I18nextProvider i18n={i18n}>
          <TooltipProvider delayDuration={0}>
            <SourcesList
              sources={[
                {
                  id: 'invoice-source',
                  name: 'Rechnung.pdf',
                  type: 'text',
                  status: 'failed',
                  processingError,
                },
              ]}
              onRemove={() => undefined}
            />
          </TooltipProvider>
        </I18nextProvider>,
      );

      fireEvent.focus(screen.getByTestId('chat-source'));
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toContain('in diesem Chat erneut hoch');
      expect(tooltip.textContent).not.toContain('secret');
    },
  );
  it('renders a source name with combining characters in one text element', () => {
    render(
      <SourcesList
        sources={[
          {
            id: 'source-1',
            name: LONG_SOURCE_NAME,
            type: 'text',
          },
        ]}
        onRemove={() => undefined}
      />,
    );

    const sourceName = screen.getByText(LONG_SOURCE_NAME);

    expect(sourceName.textContent).toBe(LONG_SOURCE_NAME);
    expect(sourceName.getAttribute('data-slot')).not.toBe('badge');
  });
});
