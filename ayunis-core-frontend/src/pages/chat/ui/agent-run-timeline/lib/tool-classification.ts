import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const RICH_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  ToolAssignmentDtoType.create_document,
  ToolAssignmentDtoType.update_document,
  ToolAssignmentDtoType.edit_document,
  ToolAssignmentDtoType.create_diagram,
  ToolAssignmentDtoType.update_diagram,
  ToolAssignmentDtoType.bar_chart,
  ToolAssignmentDtoType.line_chart,
  ToolAssignmentDtoType.pie_chart,
  ToolAssignmentDtoType.generate_image,
  ToolAssignmentDtoType.send_email,
  ToolAssignmentDtoType.create_calendar_event,
  ToolAssignmentDtoType.create_skill,
  ToolAssignmentDtoType.edit_skill,
]);

export function isRichTool(toolName: string): boolean {
  return RICH_TOOL_NAMES.has(toolName);
}
