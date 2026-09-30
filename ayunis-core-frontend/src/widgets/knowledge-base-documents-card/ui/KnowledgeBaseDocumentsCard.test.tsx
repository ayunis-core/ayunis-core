import type { ReactNode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AxiosError } from 'axios';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ayunis/ui/components/tooltip';
import type { KnowledgeBaseDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import de from '@/shared/locales/de/knowledge-bases.json';
import en from '@/shared/locales/en/knowledge-bases.json';
import commonDe from '@/shared/locales/de/common.json';
import commonEn from '@/shared/locales/en/common.json';
import KnowledgeBaseDocumentsCard, {
  type KnowledgeBaseDocumentsController,
} from './KnowledgeBaseDocumentsCard';

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

function webSource(
  overrides: Partial<KnowledgeBaseDocumentResponseDto> = {},
): KnowledgeBaseDocumentResponseDto {
  return {
    id: 'waste-calendar',
    name: 'Abfallkalender',
    type: 'text',
    createdBy: 'user',
    createdAt: '2026-09-01T06:00:00.000Z',
    updatedAt: '2026-09-25T06:00:00.000Z',
    status: 'ready',
    textType: 'web',
    url: 'https://www.stadt.example/abfall',
    reindexInterval: null,
    nextReindexAt: null,
    lastIndexedAt: '2026-09-25T06:00:00.000Z',
    lastRunFailedAt: null,
    lastRunErrorCode: null,
    ...overrides,
  };
}

function controllerWith(
  documents: KnowledgeBaseDocumentResponseDto[],
  overrides: Partial<KnowledgeBaseDocumentsController> = {},
): KnowledgeBaseDocumentsController {
  return {
    documents,
    isLoading: false,
    uploadDocument: vi.fn(),
    isUploading: false,
    removeDocument: vi.fn(),
    isRemoving: false,
    addUrlAsync: vi.fn().mockResolvedValue(undefined),
    isAddingUrl: false,
    setReindexScheduleAsync: vi.fn().mockResolvedValue(undefined),
    isSettingReindexSchedule: false,
    ...overrides,
  };
}

async function renderCard(
  controller: KnowledgeBaseDocumentsController,
  { disabled = false, language = 'en' } = {},
) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: {
      de: { 'knowledge-bases': de, common: commonDe },
      en: { 'knowledge-bases': en, common: commonEn },
    },
    defaultNS: 'knowledge-bases',
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </I18nextProvider>
  );
  return render(
    <KnowledgeBaseDocumentsCard controller={controller} disabled={disabled} />,
    { wrapper },
  );
}

function row(id = 'waste-calendar') {
  return within(screen.getByTestId(`knowledge-base-document-${id}`));
}

describe('re-index schedule action visibility', () => {
  it('offers the schedule on a ready web source the user can edit', async () => {
    await renderCard(controllerWith([webSource()]));

    expect(
      row().queryByTestId('knowledge-base-document-reindex-schedule'),
    ).not.toBeNull();
  });

  it.each([
    ['a processing web source', webSource({ status: 'processing' })],
    ['a failed web source', webSource({ status: 'failed' })],
    [
      'an uploaded file',
      webSource({ textType: 'file', url: undefined, name: 'Satzung.pdf' }),
    ],
  ])('hides the schedule on %s', async (_case, document) => {
    await renderCard(controllerWith([document]));

    expect(
      row().queryByTestId('knowledge-base-document-reindex-schedule'),
    ).toBeNull();
  });

  it('hides the schedule in a read-only view', async () => {
    await renderCard(controllerWith([webSource()]), { disabled: true });

    expect(
      row().queryByTestId('knowledge-base-document-reindex-schedule'),
    ).toBeNull();
  });

  it('hides the schedule when the scope offers no schedule editing', async () => {
    await renderCard(
      controllerWith([webSource()], { setReindexScheduleAsync: undefined }),
    );

    expect(
      row().queryByTestId('knowledge-base-document-reindex-schedule'),
    ).toBeNull();
  });

  it('shows the schedule summary to read-only viewers', async () => {
    await renderCard(
      controllerWith([
        webSource({
          reindexInterval: { value: 2, unit: 'weeks' },
          nextReindexAt: '2026-10-09T06:00:00.000Z',
        }),
      ]),
      { disabled: true },
    );

    expect(
      row().getByTestId('knowledge-base-document-reindex-summary').textContent,
    ).toContain('every 2 weeks');
  });
});

describe('failed re-index warning', () => {
  it.each([
    [
      'en',
      'Last re-index failed on Sep 30, 2026 — content is from Sep 25, 2026.',
    ],
    [
      'de',
      'Letzte Neuindexierung am 30. Sept. 2026 fehlgeschlagen – Inhalt vom 25. Sept. 2026.',
    ],
  ])(
    'shows when the last run failed after the last index (%s)',
    async (language, expected) => {
      await renderCard(
        controllerWith([
          webSource({
            lastRunFailedAt: '2026-09-30T06:00:00.000Z',
            lastRunErrorCode: 'CONTENT_DEGRADED',
          }),
        ]),
        { language },
      );

      expect(
        row().getByTestId('knowledge-base-document-reindex-warning')
          .textContent,
      ).toContain(expected);
    },
  );

  it('is gone once a later successful index is reflected', async () => {
    const failed = webSource({
      lastRunFailedAt: '2026-09-30T06:00:00.000Z',
      lastRunErrorCode: 'PROCESSING_FAILED',
    });
    const { rerender } = await renderCard(controllerWith([failed]));
    expect(
      row().queryByTestId('knowledge-base-document-reindex-warning'),
    ).not.toBeNull();

    rerender(
      <KnowledgeBaseDocumentsCard
        controller={controllerWith([
          webSource({
            lastIndexedAt: '2026-10-14T06:00:00.000Z',
            lastRunFailedAt: null,
            lastRunErrorCode: null,
          }),
        ])}
      />,
    );

    expect(
      row().queryByTestId('knowledge-base-document-reindex-warning'),
    ).toBeNull();
  });

  it('is shown to read-only viewers as well', async () => {
    await renderCard(
      controllerWith([
        webSource({ lastRunFailedAt: '2026-09-30T06:00:00.000Z' }),
      ]),
      { disabled: true },
    );

    expect(
      row().queryByTestId('knowledge-base-document-reindex-warning'),
    ).not.toBeNull();
  });
});

describe('re-index schedule dialog', () => {
  it('shows the stored schedule with its next due date and removes it', async () => {
    const controller = controllerWith([
      webSource({
        reindexInterval: { value: 2, unit: 'weeks' },
        nextReindexAt: '2026-10-09T06:00:00.000Z',
      }),
    ]);
    await renderCard(controller);

    fireEvent.click(
      row().getByTestId('knowledge-base-document-reindex-schedule'),
    );
    const dialog = within(screen.getByTestId('reindex-schedule-dialog'));
    expect(dialog.getByTestId('reindex-schedule-next-run').textContent).toBe(
      'Next re-index: Oct 09, 2026',
    );
    expect(dialog.getByTestId('reindex-interval-value')).toHaveProperty(
      'value',
      '2',
    );

    fireEvent.click(dialog.getByTestId('reindex-interval-enabled'));
    fireEvent.click(dialog.getByTestId('reindex-schedule-save'));

    await waitFor(() =>
      expect(controller.setReindexScheduleAsync).toHaveBeenCalledWith(
        'waste-calendar',
        null,
      ),
    );
  });

  it('sets a new interval', async () => {
    const controller = controllerWith([webSource()]);
    await renderCard(controller);

    fireEvent.click(
      row().getByTestId('knowledge-base-document-reindex-schedule'),
    );
    const dialog = within(screen.getByTestId('reindex-schedule-dialog'));
    fireEvent.click(dialog.getByTestId('reindex-interval-enabled'));
    fireEvent.change(dialog.getByTestId('reindex-interval-value'), {
      target: { value: '6' },
    });
    fireEvent.click(dialog.getByTestId('reindex-schedule-save'));

    await waitFor(() =>
      expect(controller.setReindexScheduleAsync).toHaveBeenCalledWith(
        'waste-calendar',
        { value: 6, unit: 'months' },
      ),
    );
  });

  it('rejects an interval longer than a year before sending it', async () => {
    const controller = controllerWith([webSource()]);
    await renderCard(controller);

    fireEvent.click(
      row().getByTestId('knowledge-base-document-reindex-schedule'),
    );
    const dialog = within(screen.getByTestId('reindex-schedule-dialog'));
    fireEvent.click(dialog.getByTestId('reindex-interval-enabled'));
    fireEvent.change(dialog.getByTestId('reindex-interval-value'), {
      target: { value: '13' },
    });
    fireEvent.click(dialog.getByTestId('reindex-schedule-save'));

    expect(
      (await dialog.findByTestId('reindex-interval-error')).textContent,
    ).toBe('Enter 1–52 weeks or 1–12 months.');
    expect(controller.setReindexScheduleAsync).not.toHaveBeenCalled();
  });

  it('shows backend validation errors on the interval field', async () => {
    const validationError = new AxiosError('Bad Request');
    validationError.response = {
      data: {
        code: 'VALIDATION_ERROR',
        errors: [
          { field: 'reindexInterval.value', constraints: ['maxForUnit'] },
        ],
      },
      status: 400,
    } as AxiosError['response'];
    const controller = controllerWith([webSource()], {
      setReindexScheduleAsync: vi.fn().mockRejectedValue(validationError),
    });
    await renderCard(controller);

    fireEvent.click(
      row().getByTestId('knowledge-base-document-reindex-schedule'),
    );
    const dialog = within(screen.getByTestId('reindex-schedule-dialog'));
    fireEvent.click(dialog.getByTestId('reindex-interval-enabled'));
    fireEvent.click(dialog.getByTestId('reindex-schedule-save'));

    expect(
      (await dialog.findByTestId('reindex-interval-error')).textContent,
    ).toBe('Enter 1–52 weeks or 1–12 months.');
  });
});

describe('add URL dialog', () => {
  function openAddUrlDialog() {
    fireEvent.click(screen.getByTestId('knowledge-base-add-url'));
    return within(screen.getByTestId('add-url-dialog'));
  }

  it('adds a URL without automatic re-indexing by default', async () => {
    const controller = controllerWith([]);
    await renderCard(controller);

    const dialog = openAddUrlDialog();
    fireEvent.change(dialog.getByTestId('add-url-input'), {
      target: { value: 'https://www.stadt.example/abfall' },
    });
    fireEvent.click(dialog.getByTestId('add-url-submit'));

    await waitFor(() =>
      expect(controller.addUrlAsync).toHaveBeenCalledWith({
        url: 'https://www.stadt.example/abfall',
        maxDepth: 0,
        reindexInterval: null,
      }),
    );
  });

  it('adds a URL with a re-index interval', async () => {
    const controller = controllerWith([]);
    await renderCard(controller);

    const dialog = openAddUrlDialog();
    fireEvent.change(dialog.getByTestId('add-url-input'), {
      target: { value: 'https://www.stadt.example/abfall' },
    });
    fireEvent.click(dialog.getByTestId('reindex-interval-enabled'));
    fireEvent.change(dialog.getByTestId('reindex-interval-value'), {
      target: { value: '3' },
    });
    fireEvent.click(dialog.getByTestId('add-url-submit'));

    await waitFor(() =>
      expect(controller.addUrlAsync).toHaveBeenCalledWith({
        url: 'https://www.stadt.example/abfall',
        maxDepth: 0,
        reindexInterval: { value: 3, unit: 'months' },
      }),
    );
  });

  it('shows an interval the backend rejected on the interval field', async () => {
    const intervalError = new AxiosError('Bad Request');
    intervalError.response = {
      data: { code: 'INVALID_REINDEX_INTERVAL' },
      status: 400,
    } as AxiosError['response'];
    const controller = controllerWith([], {
      addUrlAsync: vi.fn().mockRejectedValue(intervalError),
    });
    await renderCard(controller, { language: 'de' });

    const dialog = openAddUrlDialog();
    fireEvent.change(dialog.getByTestId('add-url-input'), {
      target: { value: 'https://www.stadt.example/abfall' },
    });
    fireEvent.click(dialog.getByTestId('reindex-interval-enabled'));
    fireEvent.click(dialog.getByTestId('add-url-submit'));

    expect(
      (await dialog.findByTestId('reindex-interval-error')).textContent,
    ).toBe('Geben Sie 1–52 Wochen oder 1–12 Monate ein.');
    expect(screen.queryByTestId('add-url-dialog')).not.toBeNull();
  });
});
