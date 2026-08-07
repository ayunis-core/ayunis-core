import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ToolUseMessageContent } from '../../model/openapi';
import CreateCalendarEventWidget from './CreateCalendarEventWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../api/useGenerateIcs', () => ({
  useGenerateIcs: () => ({ generate: vi.fn() }),
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

describe('CreateCalendarEventWidget', () => {
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
});
