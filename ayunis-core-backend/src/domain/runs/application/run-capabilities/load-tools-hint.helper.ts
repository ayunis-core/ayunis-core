import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { CapabilityAssemblyState } from './run-capability';

/**
 * For guidance that names tools of on-demand capabilities: one bullet per
 * tool group that holds some of `toolNames` and is available but not loaded,
 * telling the model to load it first. Empty when the run offers them all.
 */
export function loadToolsHints(
  state: CapabilityAssemblyState,
  toolNames: readonly string[],
): string[] {
  const loadable = toolNames.filter((name) =>
    state.loadableToolNames.has(name),
  );
  return state.capabilityCatalog.flatMap(({ id, toolNames: groupTools }) => {
    const tools = loadable.filter((name) => groupTools.includes(name));
    if (tools.length === 0) return [];
    const [subject, verb, object] =
      tools.length === 1
        ? [tools[0], 'is', 'it']
        : [joinNames(tools), 'are', 'one of them'];
    return [
      `- ${subject} ${verb} in the tool group ${id}, which is not loaded yet. Before you call ${object}, call ${ToolType.LOAD_TOOLS} with {"groups":["${id}"]}, then make the call in your next turn.`,
    ];
  });
}

function joinNames(names: readonly string[]): string {
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
