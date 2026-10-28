import type { Message } from '@/pages/chat/model/openapi';
import { resolvePiiTokens } from '@/widgets/markdown';

interface PiiMask {
  token: string;
  value: string;
}

function promptText(message: Message): string {
  return message.content
    .flatMap((content) =>
      'text' in content && !content.isSkillInstruction ? [content.text] : [],
    )
    .join('\n\n');
}

export function sentPrompts(
  messages: readonly Message[],
  piiMasks: readonly PiiMask[],
  pendingPrompt: string | null = null,
): string[] {
  const masks = new Map(piiMasks.map((mask) => [mask.token, mask]));
  const prompts = messages.flatMap((message) => {
    if (message.role !== 'user') return [];
    const prompt = promptText(message);
    return prompt.trim() ? [resolvePiiTokens(prompt, masks)] : [];
  });
  // The thread already shows a just-sent prompt before the server echoes it.
  if (pendingPrompt?.trim() && prompts.at(-1) !== pendingPrompt) {
    prompts.push(pendingPrompt);
  }
  return prompts;
}
