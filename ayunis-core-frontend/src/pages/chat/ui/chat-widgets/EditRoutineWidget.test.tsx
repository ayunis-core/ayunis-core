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
import EditRoutineWidget from '@/pages/chat/ui/chat-widgets/EditRoutineWidget';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const STORED_ROUTINE = {
  id: 'routine-id',
  name: 'Stored name',
  prompt: 'Stored prompt',
  modelId: 'model-id',
  dailyTime: '07:00',
  internetEnabled: false,
};

const content = {
  type: 'tool_use',
  id: 'tc-1',
  name: 'edit_routine',
  params: {
    routine_id: STORED_ROUTINE.id,
    name: 'Proposed name',
    prompt: '',
    daily_time: '',
    change_summary: 'Rename',
  },
} as unknown as ToolUseMessageContent;

function renderWidget() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(<EditRoutineWidget content={content} />, { wrapper });
}

describe('EditRoutineWidget', () => {
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

  beforeEach(() => {
    request.mockImplementation(
      ({
        url,
        method,
        data,
      }: {
        url: string;
        method: string;
        data: object;
      }) => {
        if (url === `/routines/${STORED_ROUTINE.id}` && method === 'PATCH') {
          return Promise.resolve({ ...STORED_ROUTINE, ...data });
        }
        if (url === `/routines/${STORED_ROUTINE.id}`) {
          return Promise.resolve(STORED_ROUTINE);
        }
        return Promise.resolve([]);
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps the saved values in the form after updating instead of reverting to the proposal', async () => {
    renderWidget();
    await waitFor(() =>
      expect(screen.getByTestId('edit-routine-widget-submit')).toHaveProperty(
        'disabled',
        false,
      ),
    );

    fireEvent.change(screen.getByTestId('routine-form-name'), {
      target: { value: 'Reviewed name' },
    });
    fireEvent.click(screen.getByTestId('edit-routine-widget-submit'));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          data: expect.objectContaining({ name: 'Reviewed name' }) as unknown,
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('routine-form-name')).toHaveProperty(
        'disabled',
        true,
      ),
    );
    expect(screen.getByTestId('routine-form-name')).toHaveProperty(
      'value',
      'Reviewed name',
    );
  });

  it('does not accept edits before the stored routine has loaded, so none are lost when it arrives', () => {
    request.mockImplementation(() => new Promise(() => undefined));
    renderWidget();

    expect(screen.getByTestId('routine-form-name')).toHaveProperty(
      'disabled',
      true,
    );
  });
});
