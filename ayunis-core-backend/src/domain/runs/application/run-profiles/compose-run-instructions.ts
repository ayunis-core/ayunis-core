import type { Tool } from 'src/domain/tools/domain/tool.entity';
import {
  PromptSlot,
  type PromptSection,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import type { RunProfile } from './run-profile';

export function composeRunInstructions(
  profile: Pick<RunProfile, 'preamble' | 'closing'>,
  sections: readonly PromptSection[],
  tools: readonly Tool[],
): string {
  const slot = (name: PromptSlot): string[] =>
    sections
      .filter((section) => section.slot === name)
      .map((section) => section.content);
  return [
    profile.preamble,
    ...slot(PromptSlot.FRAMING),
    composeToolUsage(slot(PromptSlot.TOOL_USAGE), tools),
    ...slot(PromptSlot.RESOURCES),
    ...slot(PromptSlot.POLICIES),
    ...slot(PromptSlot.CUSTOM_INSTRUCTIONS),
    profile.closing,
    ...slot(PromptSlot.RUN_NOTES),
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function composeToolUsage(guidance: string[], tools: readonly Tool[]): string {
  const descriptions = tools
    .filter((tool) => tool.descriptionLong)
    .map((tool) => `<${tool.name}>\n${tool.descriptionLong}\n</${tool.name}>`);
  if (guidance.length === 0 && descriptions.length === 0) return '';
  return `<tool_usage>

${guidance.join('\n\n')}

${descriptions.join('\n\n')}

</tool_usage>`;
}
