import { randomUUID } from 'crypto';
import { CreateCalendarEventToolHandler } from './create-calendar-event-tool.handler';
import { CreateCalendarEventTool } from '../../domain/tools/create-calendar-event-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';

describe('CreateCalendarEventToolHandler', () => {
  let handler: CreateCalendarEventToolHandler;
  let tool: CreateCalendarEventTool;
  const context = { orgId: randomUUID(), threadId: randomUUID() };

  const validInput = {
    title: 'Team sync',
    description: 'Weekly sync',
    location: 'Room 1',
    start: '2025-01-31T14:30:00Z',
    end: '2025-01-31T15:30:00Z',
  };

  beforeEach(() => {
    handler = new CreateCalendarEventToolHandler();
    tool = new CreateCalendarEventTool();
  });

  it('resolves for a valid event', async () => {
    await expect(
      handler.execute({ tool, input: validInput, context }),
    ).resolves.toContain('displayed successfully');
  });

  it('exposes a helpful error to the LLM when start is not a valid date', async () => {
    const input = { ...validInput, start: 'not-a-date' };

    await expect(
      handler.execute({ tool, input, context }),
    ).rejects.toBeInstanceOf(ToolExecutionFailedError);

    try {
      await handler.execute({ tool, input, context });
      fail('Expected ToolExecutionFailedError');
    } catch (error) {
      const failure = error as ToolExecutionFailedError;
      expect(failure.exposeToLLM).toBe(true);
      expect(failure.message).toContain("'start'");
    }
  });

  it('exposes a helpful error when end is before start', async () => {
    const input = {
      ...validInput,
      start: '2025-01-31T15:30:00Z',
      end: '2025-01-31T14:30:00Z',
    };

    try {
      await handler.execute({ tool, input, context });
      fail('Expected ToolExecutionFailedError');
    } catch (error) {
      const failure = error as ToolExecutionFailedError;
      expect(failure.exposeToLLM).toBe(true);
      expect(failure.message).toContain("'end' must be after 'start'");
    }
  });

  it('exposes a helpful error when a required parameter is missing', async () => {
    const input: Record<string, unknown> = {
      description: validInput.description,
      location: validInput.location,
      start: validInput.start,
      end: validInput.end,
    };

    await expect(
      handler.execute({ tool, input, context }),
    ).rejects.toBeInstanceOf(ToolExecutionFailedError);
  });
});
