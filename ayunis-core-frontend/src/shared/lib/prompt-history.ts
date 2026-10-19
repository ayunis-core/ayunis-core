const MAX_PROMPTS = 50;
// Module memory so recall works across threads (ChatPage remounts the input
// per thread); a reload starts empty. Bound to the signed-in user so nobody
// else in the same tab can recall these prompts, whichever way they signed in.
const sentPrompts: string[] = [];
let ownerId: string | null = null;

export function setPromptHistoryOwner(userId: string): void {
  if (ownerId !== userId) clearPromptHistory();
  ownerId = userId;
}

export function getSentPrompts(): readonly string[] {
  return sentPrompts;
}

export function recordSentPrompt(prompt: string): void {
  if (!prompt.trim() || sentPrompts.at(-1) === prompt) return;
  sentPrompts.push(prompt);
  if (sentPrompts.length > MAX_PROMPTS) sentPrompts.shift();
}

export function clearPromptHistory(): void {
  sentPrompts.length = 0;
  ownerId = null;
}
