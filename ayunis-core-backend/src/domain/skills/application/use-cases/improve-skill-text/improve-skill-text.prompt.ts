import type { ImproveSkillTextCommand } from './improve-skill-text.command';
import { SkillTextField } from './improve-skill-text.command';

const TRIGGER_GUIDANCE = `You are rewriting the TRIGGER of a skill. The trigger decides when the assistant reaches for this skill, so it has to describe recognisable situations, not the skill's value.
- Name the concrete situations, topics and words that should activate it.
- Replace vague phrases such as "whenever relevant" or "if needed" with what actually happens in those moments.
- Derive the situations from the instructions when the trigger itself is thin.
- One or two sentences, no bullet points, no marketing.`;

const INSTRUCTIONS_GUIDANCE = `You are rewriting the INSTRUCTIONS of a skill. They tell the assistant how to behave once the skill is active, and they are the substantial part of a skill: a usable set runs roughly 150 to 400 words, far longer than the trigger.
- Keep every rule, exception and piece of domain knowledge the author wrote down.
- Spell out what the author left implicit: the role to take, how to work through the task, the tone to use, how the answer should be laid out, what to ask back when something is missing, and what to leave out.
- Group it into short labelled sections or bullets so it stays scannable later.
- When the author was brief, expand on how to work — never on what is true. Do not add rules, legal facts, deadlines or figures the author did not write.`;

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
