import type { Message } from '@/pages/chat/model/openapi';
import { resolvePiiTokens } from '@/widgets/markdown';

interface PiiMask {
  token: string;
  value: string;
}

export function resolvedPromptText(
  message: Message,
  masks: ReadonlyMap<string, { value: string }>,
): string {
  const prompt = message.content
    .flatMap((content) =>
      'text' in content && !content.isSkillInstruction && !content.isNudge
        ? [content.text]
        : [],
    )
    .join('\n\n');
  return resolvePiiTokens(prompt, masks);
}

export function sentPrompts(
  messages: readonly Message[],
  piiMasks: readonly PiiMask[],
  pendingPrompt: string | null = null,
): string[] {
  const masks = new Map(piiMasks.map((mask) => [mask.token, mask]));
  const prompts = messages.flatMap((message) => {
    if (message.role !== 'user') return [];
    const prompt = resolvedPromptText(message, masks);
    return prompt.trim() ? [prompt] : [];
  });
  // The thread already shows a just-sent prompt before the server echoes it.
  if (pendingPrompt?.trim() && prompts.at(-1) !== pendingPrompt) {
    prompts.push(pendingPrompt);
  }
  return prompts;
}
