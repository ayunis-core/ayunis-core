export function canSubmitMessage({
  text,
  hasAttachments,
  hasSkill,
  busy,
}: {
  text: string;
  hasAttachments?: boolean;
  hasSkill?: boolean;
  busy: boolean;
}): boolean {
  return !busy && Boolean(text.trim() || hasAttachments || hasSkill);
}
