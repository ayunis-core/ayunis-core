import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import CreateCalendarEventWidget from './CreateCalendarEventWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const { generate, saveBlobAs, trackOutcome } = vi.hoisted(() => ({
  generate: vi.fn(),
  saveBlobAs: vi.fn(),
  trackOutcome: vi.fn(),
}));

vi.mock('@/pages/chat/api/useGenerateIcs', () => ({
  useGenerateIcs: () => ({ generate }),
}));

vi.mock('@/shared/lib/save-blob-as', () => ({ saveBlobAs }));

vi.mock('@/shared/lib/openpanel-outcomes', () => ({
  useTrackProductiveOutcome: () => trackOutcome,
}));

vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
}));

vi.mock('@/widgets/date-time-picker/ui/DateTimePickerWidget', () => ({
  DateTimePickerWidget: ({ date }: { date?: Date }) => (
    <div data-testid="date-picker">{date ? date.toISOString() : 'no-date'}</div>
  ),
}));

function makeContent(params: Record<string, unknown>): ToolUseMessageContent {
  return {
    type: 'tool_use',
    id: 'tc-1',
    name: 'create_calendar_event',
    params,
  } as unknown as ToolUseMessageContent;
}

const meeting = makeContent({
  title: 'Sitzung',
  start: '2026-01-31T14:30:00Z',
  end: '2026-01-31T15:30:00Z',
});

describe('CreateCalendarEventWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when dates are unparseable (AYC-675)', () => {
    render(
      <CreateCalendarEventWidget
        content={makeContent({
          title: 'Sitzung',
          start: 'not-a-date',
          end: '2026-0',
        })}
      />,
    );

    expect(screen.getByDisplayValue('Sitzung')).toBeDefined();
    for (const picker of screen.getAllByTestId('date-picker')) {
      expect(picker.textContent).toBe('no-date');
    }
  });

  it('passes parseable dates through to the pickers', () => {
    render(
      <CreateCalendarEventWidget
        content={makeContent({
          title: 'Sitzung',
          start: '2026-01-31T14:30:00Z',
          end: '2026-01-31T15:30:00Z',
        })}
      />,
    );

    const [startPicker, endPicker] = screen.getAllByTestId('date-picker');
    expect(startPicker.textContent).toBe('2026-01-31T14:30:00.000Z');
    expect(endPicker.textContent).toBe('2026-01-31T15:30:00.000Z');
  });

  it('sends calendar_event_downloaded once the .ics download started', () => {
    generate.mockReturnValue('BEGIN:VCALENDAR');
    render(<CreateCalendarEventWidget content={meeting} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.create_calendar_event.downloadIcs',
      }),
    );

    expect(saveBlobAs).toHaveBeenCalledTimes(1);
    expect(trackOutcome.mock.calls).toEqual([
      [
        {
          outcome_type: 'calendar_event_downloaded',
          output_type: 'calendar_event',
          format: 'ics',
        },
      ],
    ]);
  });

  it('sends nothing when the .ics could not be generated', () => {
    generate.mockReturnValue(undefined);
    render(<CreateCalendarEventWidget content={meeting} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'chat.tools.create_calendar_event.downloadIcs',
      }),
    );

    expect(saveBlobAs).not.toHaveBeenCalled();
    expect(trackOutcome).not.toHaveBeenCalled();
  });
});
