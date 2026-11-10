import { randomUUID } from 'crypto';
import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const CREATE_ROUTINE_PROMPT = 'E2E create routine: ';
const EDIT_ROUTINE_PROMPT = 'E2E edit routine: ';

/**
 * Proposes a routine named after the create trigger, or an edit of the
 * routine whose ID follows the edit trigger, when the run offers the widget.
 * Without the widget the default reply follows, so a test can tell a user
 * who may not manage routines apart.
 */
export function mockRoutineWidgetResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  const offered = new Set(request.tools.map((tool) => tool.name));
  if (userText.startsWith(CREATE_ROUTINE_PROMPT)) {
    if (!offered.has('create_routine')) return null;
    return toolCallResponse('create_routine', {
      name: userText.slice(CREATE_ROUTINE_PROMPT.length),
      prompt:
        'Prüfe das heutige Amtsblatt auf neue Bekanntmachungen zur Grundsteuer.',
      daily_time: '06:45',
      internet_enabled: true,
    });
  }
  if (userText.startsWith(EDIT_ROUTINE_PROMPT)) {
    if (!offered.has('edit_routine')) return null;
    return toolCallResponse('edit_routine', {
      routine_id: userText.slice(EDIT_ROUTINE_PROMPT.length),
      name: '',
      prompt: '',
      daily_time: '08:15',
      internet_enabled: false,
      change_summary: 'Später ausführen, ohne Internet',
    });
  }
  return null;
}

async function* toolCallResponse(
  name: string,
  args: Record<string, unknown>,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield {
    toolCallDeltas: [
      {
        index: 0,
        // Unique like a provider's, since a routine remembers the call it was created from.
        id: `mock-${name}-${randomUUID()}`,
        name,
        argumentsDelta: JSON.stringify(args),
      },
    ],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}
