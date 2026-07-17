const RICH_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  'create_document',
  'update_document',
  'edit_document',
  'create_diagram',
  'update_diagram',
  'create_spreadsheet',
  'update_spreadsheet',
  'bar_chart',
  'line_chart',
  'pie_chart',
  'generate_image',
  'send_email',
  'create_calendar_event',
  'create_skill',
  'edit_skill',
]);

export function isRichTool(toolName: string): boolean {
  return RICH_TOOL_NAMES.has(toolName);
}
