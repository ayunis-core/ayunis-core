import type { ImproveSkillTextCommand } from './improve-skill-text.command';
import { SkillTextField } from './improve-skill-text.command';

const TRIGGER_GUIDANCE = `You are rewriting the TRIGGER of a skill. The trigger decides when the assistant reaches for this skill, so it has to describe recognisable situations, not the skill's value.
- Name the concrete situations, topics and words that should activate it.
- Replace vague phrases such as "whenever relevant" or "if needed" with what actually happens in those moments.
- Derive the situations from the instructions when the trigger itself is thin.
- One or two sentences, no bullet points, no marketing.`;

const INSTRUCTIONS_GUIDANCE = `You are rewriting the INSTRUCTIONS of a skill. They tell the assistant how to behave once the skill is active.
- Keep every rule, exception and piece of domain knowledge the author wrote down. Never invent new ones.
- Make implicit expectations explicit: output format, tone, what to ask back, what to leave out.
- Structure with short paragraphs or bullets when that makes the steps clearer.
- Stay within what the trigger and the author's text already cover.`;

export function buildImproveSkillTextPrompt(
  command: ImproveSkillTextCommand,
): string {
  const guidance =
    command.field === SkillTextField.INSTRUCTIONS
      ? INSTRUCTIONS_GUIDANCE
      : TRIGGER_GUIDANCE;

  return `${guidance}

Write in the same language the author used. Keep their voice and their level of formality — this stays their skill. Return only the rewritten text, without quotes, labels or any explanation.

Skill name: ${command.name?.trim() || '(not given yet)'}

Trigger as written by the author:
${command.trigger.trim() || '(empty)'}

Instructions as written by the author:
${command.instructions.trim() || '(empty)'}`;
}
