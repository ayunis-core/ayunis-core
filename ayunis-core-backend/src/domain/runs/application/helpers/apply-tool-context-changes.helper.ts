import type { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { markToolAsRecentlyActivated } from './mark-tool-as-recently-activated.helper';

export function applyToolContextChanges(
  contents: ToolResultMessageContent[],
  activatedToolNames: Set<string>,
): boolean {
  const skillWasActivated = contents.some(
    (content) => content.toolName === (ToolType.ACTIVATE_SKILL as string),
  );
  const loadedToolNames = contents
    .filter((content) => content.toolName === (ToolType.LOAD_TOOLS as string))
    .flatMap((content) => extractLoadedToolNames(content.result));
  loadedToolNames.forEach((toolName) =>
    markToolAsRecentlyActivated(activatedToolNames, toolName),
  );
  return skillWasActivated || loadedToolNames.length > 0;
}

function extractLoadedToolNames(result: string): string[] {
  try {
    const parsed: unknown = JSON.parse(result);
    if (!isRecord(parsed) || !Array.isArray(parsed.loadedToolNames)) return [];
    return parsed.loadedToolNames.filter(
      (name): name is string => typeof name === 'string',
    );
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
