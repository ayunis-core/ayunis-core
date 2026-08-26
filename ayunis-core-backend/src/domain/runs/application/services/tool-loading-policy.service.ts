import { Injectable } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const MAX_LOADED_TOOLS = 14;

const DEFAULT_LOADED_TOOL_TYPES = new Set<ToolType>([
  ToolType.CODE_EXECUTION,
  ToolType.SEND_EMAIL,
  ToolType.CREATE_CALENDAR_EVENT,
  ToolType.SOURCE_QUERY,
  ToolType.SOURCE_GET_TEXT,
  ToolType.KNOWLEDGE_QUERY,
  ToolType.KNOWLEDGE_GET_TEXT,
  ToolType.INTERNET_SEARCH,
  ToolType.WEBSITE_CONTENT,
  ToolType.ACTIVATE_SKILL,
]);

export interface ToolLoadingSelection {
  loadedTools: Tool[];
  deferredTools: Tool[];
}

@Injectable()
export class ToolLoadingPolicyService {
  select(
    tools: Tool[],
    activatedToolNames: ReadonlySet<string>,
  ): ToolLoadingSelection {
    const defaults = tools.filter((tool) =>
      DEFAULT_LOADED_TOOL_TYPES.has(tool.type),
    );
    const defaultNames = new Set(defaults.map((tool) => tool.name));
    const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
    const activated = [...activatedToolNames]
      .reverse()
      .filter((name) => !defaultNames.has(name))
      .map((name) => toolsByName.get(name))
      .filter((tool): tool is Tool => tool !== undefined);
    const loadedTools = [...defaults, ...activated].slice(0, MAX_LOADED_TOOLS);
    const loadedNames = new Set(loadedTools.map((tool) => tool.name));
    return {
      loadedTools,
      deferredTools: tools.filter((tool) => !loadedNames.has(tool.name)),
    };
  }
}
