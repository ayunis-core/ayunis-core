export const OUTLOOK_TOOL = {
  readEmail: 'outlook__read_email',
  readAttachment: 'outlook__read_attachment',
  draftEmail: 'outlook__draft_email',
  moveEmailToComposer: 'outlook__move_email_to_composer',
  saveEmailToDraft: 'outlook__save_email_to_draft',
} as const;

export type OutlookToolName = (typeof OUTLOOK_TOOL)[keyof typeof OUTLOOK_TOOL];

const OUTLOOK_TOOL_NAMES: ReadonlySet<string> = new Set(
  Object.values(OUTLOOK_TOOL),
);

const AWAITING_RESULT_TOOLS: ReadonlySet<string> = new Set([
  OUTLOOK_TOOL.readEmail,
  OUTLOOK_TOOL.readAttachment,
]);

export function isOutlookTool(name: string): name is OutlookToolName {
  return OUTLOOK_TOOL_NAMES.has(name);
}

/** Read tools: the model needs their result, the pane posts it back. */
export function isAwaitingResultTool(name: string): boolean {
  return AWAITING_RESULT_TOOLS.has(name);
}
