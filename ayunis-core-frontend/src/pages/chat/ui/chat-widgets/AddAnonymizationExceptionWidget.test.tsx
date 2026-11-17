import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import type { PiiWhitelistEntryDto } from '@/shared/api';
import { PiiMaskProvider } from '@/widgets/markdown';
import AddAnonymizationExceptionWidget from './AddAnonymizationExceptionWidget';

const { request, showSuccess } = vi.hoisted(() => ({
  request: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess,
}));

const ACCEPTED = '{"status":"awaiting_confirmation","message":"…"}';
const REJECTED =
  "The tool didn't provide any result due to the following error in tool usage: too generic";

const masks = [
  {
    id: 'mask-1',
    token: '{{pii:LOCATION_1}}',
    value: 'Bayern',
    category: 'location',
    unmasked: false,
  },
];

let whitelist: PiiWhitelistEntryDto[];
let saved: PiiWhitelistEntryDto[][];

function exceptionCall(id: string, word: string): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id,
    name: 'add_anonymization_exception',
    params: { category: 'location', word },
  } as unknown as ToolUseMessageContent;
}

function renderWidgets(
  calls: { content: ToolUseMessageContent; result: string }[],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <PiiMaskProvider masks={masks}>
        {calls.map(({ content, result }) => (
          <AddAnonymizationExceptionWidget
            key={content.id}
            content={content}
            result={result}
          />
        ))}
      </PiiMaskProvider>
    </QueryClientProvider>,
  );
}

function renderWidget(result: string) {
  renderWidgets([
    { content: exceptionCall('call-1', '{{pii:LOCATION_1}}'), result },
  ]);
}

beforeEach(() => {
  whitelist = [
    { category: 'location', pattern: 'Marl' },
    { category: 'email_address', pattern: null },
  ];
  saved = [];
  request.mockReset();
  showSuccess.mockReset();
  request.mockImplementation(
    ({ method, data }: { method: string; data?: { entries: [] } }) => {
      if (method === 'PUT' && data) {
        saved.push(data.entries);
        whitelist = data.entries;
      }
      return Promise.resolve({ entries: whitelist });
    },
  );
});

afterEach(cleanup);

describe('AddAnonymizationExceptionWidget', () => {
  it('saves nothing until the admin confirms, then adds the exception to the whole list', async () => {
    renderWidget(ACCEPTED);

    await screen.findByTestId('anonymization-exception-save');
    expect(screen.getByTestId('anonymization-exception-word').textContent).toBe(
      'Bayern',
    );
    expect(saved).toEqual([]);

    fireEvent.click(screen.getByTestId('anonymization-exception-save'));

    await waitFor(() =>
      expect(saved).toEqual([
        [
          { category: 'email_address', pattern: null },
          { category: 'location', pattern: 'Marl|Bayern' },
        ],
      ]),
    );
    await screen.findByTestId('anonymization-exception-saved');
    expect(screen.queryByTestId('anonymization-exception-save')).toBeNull();
  });

  it('does not apply the confirmation to a rule that changed after the card showed it', async () => {
    renderWidget(ACCEPTED);
    await screen.findByTestId('anonymization-exception-save');
    whitelist = [{ category: 'location', pattern: 'Herten' }];

    fireEvent.click(screen.getByTestId('anonymization-exception-save'));

    await waitFor(() =>
      expect(
        screen.getByTestId('anonymization-exception-previous').textContent,
      ).toBe('Herten'),
    );
    expect(saved).toEqual([]);
  });

  it('does not report a save when the rule changed to one that already exempts the word', async () => {
    renderWidget(ACCEPTED);
    await screen.findByTestId('anonymization-exception-save');
    whitelist = [{ category: 'location', pattern: 'Marl|Bay.*' }];

    fireEvent.click(screen.getByTestId('anonymization-exception-save'));

    await screen.findByTestId('anonymization-exception-saved');
    expect(saved).toEqual([]);
    expect(showSuccess).not.toHaveBeenCalled();
  });

  it('never drops an exception when two cards are confirmed right after each other', async () => {
    renderWidgets([
      {
        content: exceptionCall('call-1', '{{pii:LOCATION_1}}'),
        result: ACCEPTED,
      },
      { content: exceptionCall('call-2', 'Herten'), result: ACCEPTED },
    ]);
    const [first, second] = await screen.findAllByTestId(
      'anonymization-exception-save',
    );

    fireEvent.click(first);
    fireEvent.click(second);

    // The second card showed the rule before the first save, so it asks again.
    await waitFor(() =>
      expect(
        screen.getByTestId('anonymization-exception-previous').textContent,
      ).toBe('Marl|Bayern'),
    );
    fireEvent.click(screen.getByTestId('anonymization-exception-save'));

    await waitFor(() =>
      expect(whitelist).toContainEqual({
        category: 'location',
        pattern: 'Marl|Bayern|Herten',
      }),
    );
  });

  it('offers nothing to save for a proposal the backend rejected', () => {
    renderWidget(REJECTED);

    expect(screen.queryByTestId('anonymization-exception-widget')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
});
