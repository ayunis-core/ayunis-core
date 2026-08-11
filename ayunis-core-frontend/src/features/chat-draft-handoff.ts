/**
 * One-shot, in-memory handoff of a locally typed draft to the new-chat
 * composer. Kept out of the URL on purpose: a `prompt` search param would put
 * the user's text into browser history and any URL logging. The draft does
 * not survive a full page reload, which is fine for a composer handoff.
 */
let draft: string | null = null;

export function handOffChatDraft(text: string): void {
  draft = text;
}

export function takeChatDraft(): string | null {
  const taken = draft;
  draft = null;
  return taken;
}
