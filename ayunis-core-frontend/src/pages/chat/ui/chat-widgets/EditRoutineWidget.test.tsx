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

vi.mock('@ayunis/api-client/request', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
// The model select needs window.matchMedia, which jsdom lacks; these tests are about the proposal.
vi.mock('@/widgets/routine-model-field', () => ({
  RoutineModelField: () => null,
}));

const STORED_ROUTINE = {
  id: 'routine-id',
  name: 'Stored name',
  prompt: 'Stored prompt',
  modelId: 'model-id',
  mode: null,
  schedule: { frequency: 'weekly', time: '07:00', weekdays: [1, 4] },
  internetAccess: 'off',
  allowedDomains: [],
};

const content = {
  type: 'tool_use',
  id: 'tc-1',
  name: 'edit_routine',
  params: {
    routine_id: STORED_ROUTINE.id,
    name: 'Proposed name',
    prompt: '',
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
          data: expect.objectContaining({
            name: 'Reviewed name',
            // The proposal has no schedule, so the stored one is kept.
            schedule: STORED_ROUTINE.schedule,
          }) as unknown,
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
