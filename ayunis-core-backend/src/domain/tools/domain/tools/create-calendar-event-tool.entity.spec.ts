import { CreateCalendarEventTool } from './create-calendar-event-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

describe('CreateCalendarEventTool', () => {
  let tool: CreateCalendarEventTool;

  const validParams = {
    title: 'Team sync',
    description: 'Weekly sync',
    location: 'Room 1',
    start: '2026-01-31T14:30:00Z',
    end: '2026-01-31T15:30:00Z',
  };

  beforeEach(() => {
    tool = new CreateCalendarEventTool();
  });

  it('should have the correct tool type and name', () => {
    expect(tool.type).toBe(ToolType.CREATE_CALENDAR_EVENT);
    expect(tool.name).toBe('create_calendar_event');
  });

  describe('validateParams', () => {
    it('should accept a valid event', () => {
      const result = tool.validateParams(validParams);

      expect(result.title).toBe('Team sync');
      expect(result.start).toBe('2026-01-31T14:30:00Z');
      expect(result.end).toBe('2026-01-31T15:30:00Z');
    });

    it('should reject an unparseable start date with an actionable message', () => {
      expect(() =>
        tool.validateParams({ ...validParams, start: 'not-a-date' }),
      ).toThrow(/'start' must be a valid ISO 8601 date-time/);
    });

    it('should reject an unparseable end date with an actionable message', () => {
      expect(() =>
        tool.validateParams({ ...validParams, end: '2026-13-99T00:00:00Z' }),
      ).toThrow(/'end' must be a valid ISO 8601 date-time/);
    });

    it('should reject an end that is not after the start', () => {
      expect(() =>
        tool.validateParams({
          ...validParams,
          start: validParams.end,
          end: validParams.start,
        }),
      ).toThrow(/'end' must be after 'start'/);
    });

    it('should reject an end equal to the start', () => {
      expect(() =>
        tool.validateParams({ ...validParams, end: validParams.start }),
      ).toThrow(/'end' must be after 'start'/);
    });

    it('should name a missing required parameter in a message the model can act on', () => {
      const withoutTitle: Record<string, unknown> = { ...validParams };
      delete withoutTitle.title;

      expect(() => tool.validateParams(withoutTitle)).toThrow(
        /missing required parameter 'title'/,
      );
    });
  });

  it('should not return PII', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
