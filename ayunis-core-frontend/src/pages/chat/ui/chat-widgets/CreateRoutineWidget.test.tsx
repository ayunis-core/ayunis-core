import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import CreateRoutineWidget from '@/pages/chat/ui/chat-widgets/CreateRoutineWidget';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const TOOL_CALL_ID = 'toolu_1';

const content = {
  type: 'tool_use',
  id: TOOL_CALL_ID,
  name: 'create_routine',
  params: {
    name: 'Proposed name',
    prompt: 'Proposed prompt',
    daily_time: '06:45',
    internet_enabled: true,
  },
} as unknown as ToolUseMessageContent;

function aStoredRoutine(overrides: object = {}) {
  return {
    id: 'routine-id',
    name: 'Saved name',
    prompt: 'Saved prompt',
    modelId: null,
    dailyTime: '07:00',
    internetEnabled: false,
    sourceToolCallId: TOOL_CALL_ID,
    ...overrides,
  };
}

function serveRoutines(initial: object[]) {
  let routines = initial;
  request.mockImplementation(
    ({ url, method, data }: { url: string; method: string; data: object }) => {
      if (url === '/routines' && method === 'POST') {
        const routine = aStoredRoutine(data);
        routines = [...routines, routine];
        return Promise.resolve(routine);
      }
      if (url === '/routines') return Promise.resolve(routines);
      return Promise.resolve([]);
    },
  );
}

function renderWidget(widgetContent = content) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(<CreateRoutineWidget content={widgetContent} />, { wrapper });
}

const submit = () => screen.getByTestId('create-routine-widget-submit');

describe('CreateRoutineWidget', () => {
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

  beforeEach(() => serveRoutines([]));

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows the routine already created from this proposal instead of offering to create it again', async () => {
    serveRoutines([aStoredRoutine()]);
    renderWidget();

    await waitFor(() =>
      expect(submit().textContent).toBe('chat.tools.create_routine.created'),
    );
    expect(submit()).toHaveProperty('disabled', true);
    expect(screen.getByTestId('routine-form-name')).toHaveProperty(
      'value',
      'Saved name',
    );
  });

  it('offers creation when only other proposals created routines', async () => {
    serveRoutines([aStoredRoutine({ sourceToolCallId: 'toolu_other' })]);
    renderWidget();

    await waitFor(() => expect(submit()).toHaveProperty('disabled', false));
    expect(screen.getByTestId('routine-form-name')).toHaveProperty(
      'value',
      'Proposed name',
    );
  });

  it('links the new routine to the proposal and stays created', async () => {
    renderWidget();
    await waitFor(() => expect(submit()).toHaveProperty('disabled', false));

    fireEvent.click(submit());

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: expect.objectContaining({
            name: 'Proposed name',
            sourceToolCallId: TOOL_CALL_ID,
          }) as unknown,
        }),
      ),
    );
    await waitFor(() =>
      expect(submit().textContent).toBe('chat.tools.create_routine.created'),
    );
    expect(submit()).toHaveProperty('disabled', true);
  });

  it('does not offer creation before it knows whether the proposal was saved', () => {
    request.mockImplementation(() => new Promise(() => undefined));
    renderWidget();

    expect(submit()).toHaveProperty('disabled', true);
  });

  it('does not offer creation while the tool call has no ID yet', async () => {
    renderWidget({ ...content, id: '' });

    await waitFor(() =>
      expect(screen.getByTestId('routine-form-name')).toHaveProperty(
        'value',
        'Proposed name',
      ),
    );
    expect(submit()).toHaveProperty('disabled', true);
  });
});
